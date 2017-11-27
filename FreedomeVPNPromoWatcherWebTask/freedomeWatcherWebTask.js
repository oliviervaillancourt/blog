'use latest';
import sendgrid from 'sendgrid@4.7.0';
import rp from 'request-promise';

const helper = sendgrid.mail;
module.exports = (context, cb) => {
  
  
  context.storage.get(function (error, data) {
        var lastTweetId = data.lastTweetId;
        
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
    
    
    if (respJson.length > 0){
      var promoTweets = [];
      for (var i = 0; i< respJson.length; ++i){
        if (respJson[i].text.includes('%')){
           promoTweets.push({tweetId: respJson[i].id_str, tweetText: respJson[i].text, tweetUrl: `https://twitter.com/i/web/status/${respJson[i].id_str}`});
        }
      }
     
      if (promoTweets.length > 0){
          const mail = new helper.Mail(
          new helper.Email("olivier.vaillancourt@gmail.com"),
          'Freedome Promo Watcher Task',
          new helper.Email('olivier.vaillancourt+freedomepromowatcher@gmail.com'),
         new helper.Content('text/plain', JSON.stringify(promoTweets[0])));
        const sg = sendgrid(context.secrets.SENDGRID_API_KEY);
        const request = sg.emptyRequest({
          method: 'POST',
          path: '/v3/mail/send',
          body: mail.toJSON()
        });
      return sg.API(request)
        .then(response => {
          context.storage.set({'lastTweetId': respJson[0].id_str}, {force:1}, function (error) {
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
