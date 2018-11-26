import URL from 'url';

import {
  respHeaders,
  dynamodb,
} from '../lib/common';

export const handler = (event, context, callback) => {
  // rubyproxy('./create.rb', event, context, callback);

  if (event.httpMethod === 'OPTIONS') {
    callback(null, {
      statusCode: 204,
      headers: respHeaders,
    });
  }

  console.log('createFave func');
  console.log(event);

  const reqBody = JSON.parse(event.body);

  let hostnameParsed;

  if (reqBody && reqBody.hostname) {
    const url = URL.parse(reqBody.hostname);

    if (url.hostname) {
      hostnameParsed = `${url.protocol}//${url.hostname}`;

      if (url.protocol && (url.protocol === 'http' || url.protocol === 'https')) {
        hostnameParsed = `${url.protocol}//${hostnameParsed}`;
      }
    }
  }

  if (!hostnameParsed) {
    callback(null, {
      statusCode: 422,
      body: JSON.stringify({
        message: 'Missing or invalid hostname',
      }),
      headers: respHeaders,
    });
  }

  const putItem = {
    TableName: 'FaveRecords',
    Item: {
      hostname: { S: hostnameParsed },
      source_ip: { S: event.requestContext.identity.sourceIp },
      created_at: { N: new Date().getTime().toString() },
    },
    ConditionExpression: 'attribute_not_exists(hostname)',
  };

  dynamodb.putItem(putItem, (putErr) => {
    if (putErr) {
      if (putErr.code === 'ConditionalCheckFailedException') {
        const getItem = {
          TableName: 'FaveRecords',
          Key: {
            hostname: { S: hostnameParsed },
          },
        };

        dynamodb.getItem(getItem, (getErr, data) => {
          if (getErr) {
            // TODO: catch errors when trying to insert the same item
            // and return different status code with existing doc
            console.log(getErr, getErr.stack);
            context.fail(getErr);
          }

          callback(null, {
            statusCode: 200,
            body: JSON.stringify({
              parsed_hostname: hostnameParsed,
              item: data,
            }),
            headers: respHeaders,
          });
        });
      } else {
        // TODO: catch errors when trying to insert the same item
        // and return different status code with existing doc
        console.log(putErr, putErr.stack);
        context.fail(putErr);
      }
    } else {
      callback(null, {
        statusCode: 202,
        body: JSON.stringify({
          parsed_hostname: hostnameParsed,
        }),
        headers: respHeaders,
      });
    }
  });
};
