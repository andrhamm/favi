var fs = require ('fs');
var parse = require ('csv-parse');

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

    var params = {Bucket: 'favi-cache', Key: 'top-1m.csv'};

    var parseParams = {
      delimiter: ',',
      from: 1,
      to: 10,
    };

    s3
      .getObject (params)
      .createReadStream ()
      .pipe (parse (parseParams))
      .on ('data', function (csvrow) {
        console.log ('row:');
        console.log (csvrow);
        //do something with csvrow
        // csvData.push (csvrow);
      })
      .on ('end', function () {
        //do something wiht csvData
        // console.log (csvData);
        console.log ('done parsing');

        callback (null, {
          statusCode: 202,
          body: JSON.stringify ({}),
          headers: respHeaders,
        });
      });
  }
};
