---
layout: post
title:  "How I updated an Auth0 Webtask to use Async/Await and why I like it so much"
subtitle: "How I reduce that my webtask code by XXXXXX lines and YYYYY level of identation"
date:   2018-05-02 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: serverless
cover:  "/img/posts/TO DO.jpg"
---

## In this blog post, we will look at how using `async / await` simplified greatly by Auth0 Webtask serverless function. 

---

### The idea.
[In a previous post]({{ site.baseurl }}{% post_url 2017-12-22-Freedome-discount-using-serverless %}) I used a serverless platform ([Auth0 Webtask](https://webtask.io)) to save money.  That was a great nodeJs learning opportunity for me but it left me with a desire to try `async/await` in nodeJs which looked for familiar to me coming from the `C#` stack.

Since Webtask now runs on Node 8, support for `async/await` is available.  So let's use it.

### Step 1, identity what would benefit from `async/await`

Basically my function does 3 things:
1. Looks up the built-in Webtask storage for the Id of the last processed tweet
2. Makes an `https` request the the Twitter api (using `axios` http module from NPM)
3. Sends an email using `sendgrid` if a discount on FreeDomeVPN was found in a tweet
4. Updates the storage with the last processed tweet.

*Everthing here is an async operation that was previously handled with callbacks (which are REALLY not as nice as `async/await`)*

### Step 2, let's dig deeper into the storage situation
Webtask built-in storage api doesn't support `async/await` natively (that I know of anyways), so let's wrap calls to read and update storage.

Since `async/await` is really using `Promises`, I wrote this:

```js
async function getLastTweetId(storage) {
    return new Promise(resolve => {
        storage.get(function (error, data) {
            resolve(data.lastTweetId);
        });
    });
}
```

which I invoke using by passing the `storage` object supplied by the platform:

```js
const lastTweetId = await getLastTweetId(context.storage);
```

This might not seem like a big improvement but you'll see later why it is.  I also applied the same principle to the Update operation on the storage

### Step 3, Make the http request to the twitter API use `async/await` too

This is one is super straightforward since [Axios](https://www.npmjs.com/package/axios) already supports `async/await`.

```js
const response = await axios.get(twitterUrl, { 
    headers: {
        Authorization: 'Bearer ' + context.secrets.TWITTER_API_KEY 
        } 
    });
```

### Step 4, putting it all together

Now that we have small `async` functions that can be called in a sequence, we just need to piece them together and not worry too much about the fact that they run asynchronously.

```js
try {
    const lastTweetId = await getLastTweetId(context.storage);

    var twitterUrl = 'https://api.twitter.com/1.1/statuses/...';
    
    <... lines removed for brevity> 

    const response = await axios.get(twitterUrl, { headers: { Authorization: '...' });

    <... lines removed for brevity>

    await sendEmail(context, promoTweets[0]);
    await setLastTweetId(context.storage, tweetsToInspect[0].id_str);
    
    cb(null, "All done");
} catch (error) {
    cb(error);
}
```

The fact that the main flow can be read ono the same indentation line feels **so much nicer** to me.

### Conclusion / Lessons learned / What's next
For the same workload, using `async/await` resulted in:
- Reduction of identation by *3* (5 in the `async/await` way vs 8 in the `callback` way) 

`async/await` is great.  Feels better to me than callback *'hell'*