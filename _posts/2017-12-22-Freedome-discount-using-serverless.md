---
layout: post
title:  "Saving money on Freedome VPN while playing with serverless computing"
subtitle: "Using serverless to watch @FreedomeVPN and getting notified when there's a discounted price"
date:   2017-12-12 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: serverless vpn
cover:  "/img/posts/freedome_serverless/FreeDome-Webtask-Twitter-MainImage.jpg"
---

## In this blog post, we will cover how to use [Auth0's Webtask](https://webtask.io), a serverless platform to monitor the twitter feed of *FreedomeVPN* and send us an email using [Sendgrid](https://sendgrid.com) when we find a promotion on Freedome VPN

----

### The idea
Ok, so the idea is to watch the tweets from @freedomeVPN (using the Twitter API) and when there's a tweet that seems like it's a promo on the [freedome VPN service](https://www.f-secure.com/en/web/home_global/freedome), be notified so that we can save some money.  I've been using freedome on my Windows PC and Android phone for 1+ year now and it's great.  I started using it on [Troy Hunt's](https://www.troyhunt.com/the-importance-of-trust-and-integrity-in-a-vpn-provider-and-how-mysafevpn-blew-it/) recommendation and I'm very satisfied with it.  

Example of email received when the notification fires:
![email received](/img/posts/freedome_serverless/sampleEmail.png)

> Ok, it's a bit rough and could be improved but it does the job for now ;)

### How are we going to do this?
*Serverless* is pretty hot these days.  The idea being that you can just worry about code and NOT the infrastructure on which it runs is great.  Also, serverless platform (Auth0 Webtask, Azure Functions, AWS Lamba) are very cheap, even free when your usage is low.  

So, we write a javascript function that will, on a schedule:

- fetch the latest tweets from `@freedomeVPN`
- Scan through each tweet's text to figure out if there's a promotion in there
- Use the [Sendgrid Mail v3 API ](https://sendgrid.com/docs/API_Reference/api_v3.html) to send ourselves an email with that tweet information

### Step 1: setup a `twitter` dev account and app
- If not already done, head over to <https://developer.twitter.com> and register as a twitter dev (think you need to click on 'Apply')
- Twitter API works off the concept of application.  Basically any https calls made to the API must be made in the *context* of an application.  There's a lot more than we need here, but we still need an application.  Navigate to <https://apps.twitter.com> and create a new application like so:
![twitter app creation](/img/posts/freedome_serverless/twitterAppCreation.png)
- Then take note of the `API Key` and `API Secret` from the `Keys and Access Tokens` tab.  They will be used to authenticate against the twitter api later:
![twitter keys](/img/posts/freedome_serverless/twitterAppKeys.png)

### Step 2: setup a `Sendgrid` account
1. Create yourself a free account at <https://sendgrid.com>.
2. I think you have to complete their **Integration** flow for your account to be active, but I'm not sure.  I had a little bit of difficulty here and had to chat with support which got the matter resolved.
3. Get an API key like so: **Take a note of the API Key somewhere**:
![sendgrid Api Key](/img/posts/freedome_serverless/sendGridApiKey.png)

### Step 3: setup an `Auth0 webtask`
1. Go to <https://webtask.io> and setup your account
2. You can use the CLI to create the webtask but I've used the HTML editor instead.  So go to <https://webtask.io/make> to invoke the editor
3. Create a new Webtask (select `Empty Function` for the type) and give it a name

### Step 4: Put some code in the function
You can start with this code:
```js
'use latest';
import sendgrid from 'sendgrid@4.7.0';
import rp from 'request-promise';

const helper = sendgrid.mail;
module.exports = (context, cb) => {


    context.storage.get(function (error, data) {
        var lastTweetId = data.lastTweetId;
        var fromEmail = context.secrets.FROM_EMAIL;
        var toEmail = context.secrets.TO_EMAIL;

        var twitterUrl = 'https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=freedomeVPN&count=100&exclude_replies=true&trim_user=true';
        if (lastTweetId) {
            twitterUrl += '&since_id=' + lastTweetId;
        }
        var options = {
            uri: twitterUrl,
            headers: {
                'Authorization': 'Bearer ' + context.secrets.TWITTER_API_KEY
            },
            json: true // Automatically parses the JSON string in the response
        };

        return rp(options)
            .then(function (respJson) {

                //console.log("resp: " + JSON.stringify(respJson));


                if (respJson.length > 0) {
                    var promoTweets = [];
                    for (var i = 0; i < respJson.length; ++i) {
                        if (respJson[i].text.includes('%')) {
                            promoTweets.push({ tweetId: respJson[i].id_str, tweetText: respJson[i].text, tweetUrl: `https://twitter.com/i/web/status/${respJson[i].id_str}` });
                        }
                    }

                    if (promoTweets.length > 0) {
                        const mail = new helper.Mail(
                            new helper.Email(fromEmail),
                            'Freedome Promo Watcher Task',
                            new helper.Email(toEmail),
                            new helper.Content('text/plain', JSON.stringify(promoTweets[0])));
                        const sg = sendgrid(context.secrets.SENDGRID_API_KEY);
                        const request = sg.emptyRequest({
                            method: 'POST',
                            path: '/v3/mail/send',
                            body: mail.toJSON()
                        });
                        return sg.API(request)
                            .then(response => {
                                context.storage.set({ 'lastTweetId': respJson[0].id_str }, { force: 1 }, function (error) {
                                    if (error) return cb(error);
                                    cb(null, response)
                                });
                            })
                            .catch(cb);

                    } else {
                        cb(null, `Found ${promoTweets.length} new tweet but no promo`);
                    }

                } else {
                    cb(null, "no new tweet since: " + lastTweetId);
                }
            })
            .catch(cb);
    });
};

``` 

Let's break it down a bit...

**First** the programming model that webtask uses is described in details [here](https://webtask.io/docs/model) but the general idea of it is that we need to export a function that will call the node.js callback function (`cb` in this case) when your job is done.  `Auth0 webtask` will invoke our function either on 1) a http request on the webtask URL or 2) on a CRON schedule.

```js
module.exports = (context, cb) => {cb(null, "Job done")}
```

**Second** we will need to invoke the twitter API to get tweets.
We do this by invoke the twitter API at `https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=freedomeVPN&count=100&exclude_replies=true&trim_user=true&since_id=XXXXXX`.  This basically gets us a JSON response with all tweets from @freedomeVPN since the tweetId specified on the `since_id` parameter

We must include our authentication header to those calls.  This is a 2 step process.

We will be using the the concept of `application only` authentication for the twitter api.  This means that we have to exchange our username/password for a bearer token and then use that bearer token against the twitter API.

Since the bearer don't seem to expire, we just use Postman to `POST` to <https://api.twitter.com/oauth2/token> using basic auth where the username is the API key and the password is the API Secret.  That gives us back an access token in the form of `Bearer XXXXXX`
![twitter Creds to Bearer Token](/img/posts/freedome_serverless/twitterCredsToToken.png)
  We set that bearer on the authorization header of every twitter API calls like so:

```
    headers: {
    'Authorization': 'Bearer ' + context.secrets.TWITTER_API_KEY
```
Notice that we are pulling the twitter api key from a Webtask concept called `secrets`.  This is basically a set of encrypted value that your webtask has access to.  Great place to put API keys.  In order to set the secret, you can use the editor 
![secret manager](/img/posts/freedome_serverless/secretManager.png)

**Third** we will check if any tweet returned by the API seem to have a promotion in it.  So far, this check is *very very very* simplistic (we just check that the string of the tweet contains '%')
```js
if (respJson[i].text.includes('%')) {
```

**Fourth**
We invoke Sendgrid HTTPS API to send ourselves an email

**Fifth**
We have to save the last tweet ID returned in this request to not request it again later.  This is used by leveraging another of Auth0 Webtask feature called `storage`.  `Storage` a 500 kb JSON object that you can read and write to.  So we save our lastTweetId this way:
```js
    context.storage.set({ 'lastTweetId': respJson[0].id_str }, { force: 1 }, ... 
```

### Step 5: Set the task to run on Schedule
You can now set the task to run every X.  We have ours set to run every 6 hours.  This can be accomplish from here:

![cronSchedule](/img/posts/freedome_serverless/cronSchedule.png)

### It's a bit rough --> things that could be improved

As you can see, this is still a bit rough around the edges and a lot of things can be improved.  For example:

- Simplify the nested callback structure
  - Maybe using things like `Async` npm module to make code more readable
- Handle the case where multiple tweets have the '%' char in it
- ...

### Conclusion

I've worked on this webtask because I wanted to experiment with threading together different services in a serverless environment. I know there are other options out there to do similar things.

* I've tried <https://ifttt.com> and it seems like I was lagging a way to apply filtering on the incoming tweets
* I know <https://zapier.com> can be used here but not sure about the pricing

*Hope it helps* 
