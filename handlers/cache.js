'use strict';

const AWS = require ('aws-sdk');
const S3 = new AWS.S3 ();

module.exports.cacheFavicon = (event, context, callback) => {
  console.log ('cacheFavicon func');
  console.log (event);

  var events = event.Records;
  for (var i = 0, len = events.length; i < len; i++) {
    if (events[i].eventName == 'MODIFY') {
      var hostname = events[i].dynamodb.Keys.hostname.S;

      if (
        events[i].dynamodb.OldImage.favicon_src == undefined &&
        events[i].dynamodb.NewImage.favicon_src
      ) {
        console.log (
          'New favicon URL detected for ' +
            hostname +
            ': ' +
            JSON.stringify (events[i])
        );
  
        // TODO: download favicon image file and write to S3 cache
      }
    }
  }
};
