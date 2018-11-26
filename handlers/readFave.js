import URL from 'url';

import {
  respHeaders,
  dynamodb,
} from '../lib/common';

export const handler = (event, context, callback) => {
  console.log('readFave func');
  console.log(event);

  const { hostname } = event.queryStringParameters;
  let hostnameParsed;

  if (hostname) {
    const url = URL.parse(hostname);

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

  const getItem = {
    TableName: 'FaveRecords',
    Key: {
      hostname: { S: hostnameParsed },
    },
  };

  dynamodb.getItem(getItem, (err, data) => {
    if (err) {
      // TODO: catch errors when trying to insert the same item
      // and return different status code with existing doc
      console.log(err, err.stack);
      context.fail(err);
    }

    callback(null, {
      statusCode: 202,
      body: JSON.stringify({
        parsed_hostname: hostnameParsed,
        item: data,
      }),
      headers: respHeaders,
    });
  });
};
