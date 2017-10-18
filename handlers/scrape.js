'use strict';

let fs = require ('fs');
let path = require ('path');

const phantomjsLambdaPack = require ('phantomjs-lambda-pack');
const exec = phantomjsLambdaPack.exec;

const AWS = require ('aws-sdk');
var dynamodb = new AWS.DynamoDB ({apiVersion: '2012-08-10'});

module.exports.scrapeFavicon = (event, context, callback) => {
  console.log ('scrapeFavicon func');
  console.log (event);

  var events = event.Records;
  for (var i = 0, len = events.length; i < len; i++) {
    if (events[i].eventName == 'INSERT') {
      var hostname = events[i].dynamodb.Keys.hostname.S;

      console.log (
        'INSERT event for hostname ' +
          hostname +
          ': ' +
          JSON.stringify (events[i])
      );

      exec (
        [__dirname + '/phantom-scraper.js', hostname],
        (error, stdout, stderr) => {
          if (error) {
            console.error (`exec error: ${error}`);
            return;
          }

          console.log (`favicon url: ${stdout}`);
          console.log (`stderr should be empty: ${stderr}`);

          var updateItem = {
            TableName: 'FaveRecords',
            ExpressionAttributeNames: {
              '#F': 'favicon_src',
              '#U': 'updated_at',
            },
            ExpressionAttributeValues: {
              ':f': {
                S: stdout,
              },
              ':u': {
                S: new Date ().getTime ().toString (),
              },
            },
            Key: {
              hostname: {
                S: hostname,
              },
            },
            ReturnValues: 'ALL_NEW',
            UpdateExpression: 'SET #F = :f, #U = :u',
            ConditionExpression: 'attribute_not_exists(favicon_src)',
          };

          dynamodb.updateItem (updateItem, function (err, data) {
            if (err && err.code != 'ConditionalCheckFailedException') {
              // TODO: catch errors when trying to insert the same item
              // and return different status code with existing doc
              console.log (err, err.stack);
              context.fail (err);
            }

            context.succeed();
          });
        }
      );
    }
  }
};
