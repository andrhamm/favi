'use strict';

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
