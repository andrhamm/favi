var fs = require ('fs');

const AWS = require ('aws-sdk');

var dynamodb = new AWS.DynamoDB ({apiVersion: '2012-08-10'});

var respHeaders = {
  // for CORS... later
  'Access-Control-Allow-Credentials': false,
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
  'Access-Control-Allow-Origin': 'https://favi.andrhamm.com',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// See https://github.com/stewartlord/serverless-ruby
// const spawn = require('child_process').spawn;
// const rubyproxy = function(file, event, context, callback) {
//   var child  = spawn(file, [JSON.stringify(event)]);
//   var stdout = '';
//   var stderr = '';

//   child.stdout.on('data', function (data) {
//     stdout += data.toString();
//   });
//   child.stderr.on('data', function (data) {
//     stderr += data.toString();
//   });

//   child.on('close', function(code) {
//     if (code !== 0) {
//       return callback(new Error(`Process exited with non-zero status code: ${code}`));
//     }
//     if (stderr) {
//       console.error(stderr);
//       console.log(stderr);
//     }

//     // We expect the child process to output valid JSON with a body
//     try {
//       var response  = JSON.parse(stdout);
//       response.body = JSON.stringify(response.body);
//       callback(null, response);
//     } catch (error) {
//       callback(error);
//     }
//   });
// }

module.exports.readFave = function (event, context, callback) {
  console.log ('readFave func');
  console.log (event);

  var hostname = event.queryStringParameters.hostname;
  var hostnameParsed;

  if (hostname) {
    const URL = require ('url');
    var url = URL.parse (hostname);

    if (url.hostname) {
      hostnameParsed = url.protocol + '//' + url.hostname;

      if (url.protocol && (url.protocol == 'http' || url.protocol == 'https')) {
        hostnameParsed = url.protocol + '//' + hostnameParsed;
      }
    }
  }

  if (!hostnameParsed) {
    callback (null, {
      statusCode: 422,
      body: JSON.stringify ({
        message: 'Missing or invalid hostname',
      }),
      headers: respHeaders,
    });
  }

  var getItem = {
    TableName: 'FaveRecords',
    Key: {
      hostname: {S: hostnameParsed},
    },
  };

  dynamodb.getItem (getItem, function (err, data) {
    if (err) {
      // TODO: catch errors when trying to insert the same item
      // and return different status code with existing doc
      console.log (err, err.stack);
      context.fail (err);
    }

    callback (null, {
      statusCode: 202,
      body: JSON.stringify ({
        parsed_hostname: hostnameParsed,
        item: data,
      }),
      headers: respHeaders,
    });
  });
};

module.exports.createFave = function (event, context, callback) {
  // rubyproxy('./create.rb', event, context, callback);

  if (event.httpMethod === 'OPTIONS') {
    callback (null, {
      statusCode: 204,
      headers: respHeaders,
    });
  }

  console.log ('createFave func');
  console.log (event);

  var reqBody = JSON.parse (event.body);

  var hostnameParsed;

  if (reqBody && reqBody.hostname) {
    const URL = require ('url');
    var url = URL.parse (reqBody.hostname);

    if (url.hostname) {
      hostnameParsed = url.protocol + '//' + url.hostname;

      if (url.protocol && (url.protocol == 'http' || url.protocol == 'https')) {
        hostnameParsed = url.protocol + '//' + hostnameParsed;
      }
    }
  }

  if (!hostnameParsed) {
    callback (null, {
      statusCode: 422,
      body: JSON.stringify ({
        message: 'Missing or invalid hostname',
      }),
      headers: respHeaders,
    });
  }

  var putItem = {
    TableName: 'FaveRecords',
    Item: {
      hostname: {S: hostnameParsed},
      source_ip: {S: event.requestContext.identity.sourceIp},
      created_at: {N: new Date ().getTime ().toString ()},
    },
    ConditionExpression: 'attribute_not_exists(hostname)',
  };

  dynamodb.putItem (putItem, function (err, data) {
    if (err) {
      if (err.code == 'ConditionalCheckFailedException') {
        var getItem = {
          TableName: 'FaveRecords',
          Key: {
            hostname: {S: hostnameParsed},
          },
        };

        dynamodb.getItem (getItem, function (err, data) {
          if (err) {
            // TODO: catch errors when trying to insert the same item
            // and return different status code with existing doc
            console.log (err, err.stack);
            context.fail (err);
          }

          callback (null, {
            statusCode: 200,
            body: JSON.stringify ({
              parsed_hostname: hostnameParsed,
              item: data,
            }),
            headers: respHeaders,
          });
        });
      } else {
        // TODO: catch errors when trying to insert the same item
        // and return different status code with existing doc
        console.log (err, err.stack);
        context.fail (err);
      }
    } else {
      callback (null, {
        statusCode: 202,
        body: JSON.stringify ({
          parsed_hostname: hostnameParsed,
        }),
        headers: respHeaders,
      });
    }
  });
};

module.exports.seedFaves = function (event, context, callback) {
  if (event.httpMethod === 'OPTIONS') {
    callback (null, {
      statusCode: 204,
      headers: respHeaders,
    });
  }

  var apiKey = event.requestContext.identity.apiKey;

  if (apiKey != process.env.FAVI_SEED_KEY) {
    callback (null, {
      statusCode: 403,
      body: JSON.stringify ({
        message: 'Forbidden',
      }),
      headers: respHeaders,
    });
  } else {
    var s3 = new AWS.S3 ({apiVersion: '2006-03-01'});

    var s3SeedFileParams = {Bucket: 'favi-cache', Key: 'top-1m.csv'};
    var s3SeedCursorFileParams = {Bucket: 'favi-cache', Key: 'seed-cursor.txt'};

    s3.getObject (s3SeedCursorFileParams, function (err, data) {
      if (err) {
        console.log (err, err.stack);
        context.fail (err);
      } else {
        cursor = parseInt (data.Body.toString ('utf-8')) || 1;
        var endCursor = cursor + 1000;

        console.log ('seed cursor start=' + cursor + ' end=' + endCursor);

        var count = 0;

        var stream = s3.getObject (s3SeedFileParams).createReadStream ();

        var csv = require ('fast-csv');

        var kinesis = new AWS.Kinesis ({apiVersion: '2013-12-02'});

        var records = [];

        var csvStream = csv
          .parse ()
          .validate (function (csvrow) {
            var i = csvrow[0];
            var hostname = csvrow[1];

            return i >= cursor && i <= endCursor;
          })
          .on ('data', function (csvrow) {
            console.log ('validated row:');
            console.log (csvrow);

            var i = csvrow[0];
            var record = {
              Data: 'http://' + csvrow[1],
              PartitionKey: '1',
            };

            records.push (record);

            count += 1;
          })
          .on ('end', function () {
            console.log ('done parsing');

            kinesis.putRecords (
              {
                Records: records,
                StreamName: 'FaveSeeds',
              },
              function (err, data) {
                if (err) {
                  console.log (err, err.stack); // an error occurred
                  context.fail (err);
                } else {
                  s3SeedCursorFileParams.Body = endCursor.toString ();

                  s3.putObject (s3SeedCursorFileParams, function (err, data) {
                    if (err) {
                      console.log (err, err.stack); // an error occurred
                      context.fail (err);
                    } else {
                      console.log ('saved cursor as ' + endCursor);

                      callback (null, {
                        statusCode: 202,
                        body: JSON.stringify ({
                          count: count,
                          cursor_start: cursor,
                          cursor_end: endCursor,
                        }),
                        headers: respHeaders,
                      });
                    }
                  });
                }
              }
            );
          });

        stream.pipe (csvStream);
      }
    });
  }
};

module.exports.streamFaves = function (event, context, callback) {
  if (event.httpMethod === 'OPTIONS') {
    callback (null, {
      statusCode: 204,
      headers: respHeaders,
    });
  }

  console.log ('streamFaves func');
  console.log (event);

  var reqBody = JSON.parse (event.body);

  var channel;
  if (reqBody && reqBody.channel) {
    channel = reqBody.channel;
  } else {
    callback (null, {
      statusCode: 422,
      body: JSON.stringify ({
        message: 'Missing or invalid channel',
      }),
      headers: respHeaders,
    });
  }

  var lambda = new AWS.Lambda ({
    region: 'us-east-1'
  });

  lambda.invoke (
    {
      FunctionName: 'favi-dev-notifyPusherAll', // TODO: respect multiple envs
      Payload: JSON.stringify ({
        channel: channel
      }),
      InvocationType: 'Event'
    },
    function (error, data) {
      if (error) {
        console.log(error, error.stack);
        context.fail(error);
      }
      
      console.log(data);
      
      callback (null, {
        statusCode: 202,
        body: JSON.stringify ({
          channel: channel
        }),
        headers: respHeaders,
      });
    }
  );
};
