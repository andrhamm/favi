const AWS = require ('aws-sdk');

var dynamodb = new AWS.DynamoDB ({apiVersion: '2012-08-10'});

var respHeaders = {
  // for CORS... later
  'Access-Control-Allow-Credentials': false,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Origin': 'https://favi.andrhamm.com',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
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
    callback(null, {
      statusCode: 204,
      headers: respHeaders
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
    }

    callback (null, {
      statusCode: 202,
      body: JSON.stringify ({
        parsed_hostname: hostnameParsed,
      }),
      headers: respHeaders,
    });
  });
};
