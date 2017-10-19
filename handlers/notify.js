'use strict';

const AWS = require ('aws-sdk');

var dynamodb = new AWS.DynamoDB ({apiVersion: '2012-08-10'});

var Pusher = require ('pusher');

var pusher = new Pusher ({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: 'us2',
  encrypted: true,
});

module.exports.notifyPusher = (event, context, callback) => {
  console.log ('cacheFavicon func');
  console.log (event);

  var events = event.Records;
  for (var i = 0, len = events.length; i < len; i++) {
    var payload = {};
    payload.type = events[i].eventName;
    payload.data = events[i].dynamodb;

    pusher.trigger (
      'faves',
      'fave-event', // 'fave-' + events[i].eventName.toLowerCase (),
      payload
    );
  }
};

module.exports.notifyPusherAll = (event, context, callback) => {
  console.log (event);

  var params = {
    ProjectionExpression: 'hostname, favicon_src',
    TableName: 'FaveRecords',
  };

  var channel = 'stream-' + event.channel;

  dynamodb.scan (params, function (err, data) {
    if (err) {
      console.log (err, err.stack);
      context.fail (err);
    } else {
      console.log (
        'Streaming ' + data.Items.length + ' faves to Pusher channel ' + channel
      );
      for (var index = 0; index < data.Items.length; index++) {
        var element = data.Items[index];

        if (element.favicon_src && element.favicon_src.S) {
          console.log (element.hostname.S + ' (' + element.favicon_src.S + ')');

          pusher.trigger (channel, 'fave-event-stream', element);
        }
      }
    }
  });
};
