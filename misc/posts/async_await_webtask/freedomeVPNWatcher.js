const axios = require('axios');

module.exports = async (context, cb) => {

    try {
        const lastTweetId = await getLastTweetId(context.storage);

        var twitterUrl = 'https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=freedomeVPN&count=100&exclude_replies=true&trim_user=true';
        if (lastTweetId) {
            twitterUrl += '&since_id=' + lastTweetId;
        }

        const response = await axios.get(twitterUrl, { headers: { Authorization: 'Bearer ' + context.secrets.TWITTER_API_KEY } });

        const tweetsToInspect = response.data;

        if (tweetsToInspect.length > 0) {
            var promoTweets = [];
            for (var i = 0; i < tweetsToInspect.length; ++i) {
                if (tweetsToInspect[i].text.includes('%')) {
                    promoTweets.push({ tweetId: tweetsToInspect[i].id_str, tweetText: tweetsToInspect[i].text, tweetUrl: `https://twitter.com/i/web/status/${tweetsToInspect[i].id_str}` });
                }
            }

            var outputMessage = "";
            if (promoTweets.length > 0) {
                await sendEmail(context, promoTweets[0]);
                outputMessage = `Found a tweet with promotion and sent email`;
            } else {
                outputMessage = `Found ${tweetsToInspect.length} new tweet but no promo`;
            }

            await setLastTweetId(context.storage, tweetsToInspect[0].id_str);
            cb(null, outputMessage)
        }

        cb(null, "no new tweet since: " + lastTweetId);
    } catch (error) {
        cb(error);
    }
};

async function getLastTweetId(storage) {
    return new Promise(resolve => {
        console.log("reading last processed tweet");
        storage.get(function (error, data) {
            resolve(data.lastTweetId);
        });
    });
}

async function setLastTweetId(storage, tweetId) {
    return new Promise((resolve, reject) => {
        console.log(`setting last processed tweet to ${tweetId}`);
        storage.set({ 'lastTweetId': tweetId }, { force: 1 }, function (error) {
            if (error) reject();
            resolve();
        });
    });
}

function sendEmail(context, tweetWithPromo) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(context.secrets.SENDGRID_API_KEY);

    const msg = {
        to: context.secrets.TO_EMAIL,
        from: context.secrets.FROM_EMAIL,
        subject: 'Freedome Promo Watcher Task',
        text: JSON.stringify(tweetWithPromo),
        html: JSON.stringify(tweetWithPromo),
    };

    sgMail.send(msg);
}