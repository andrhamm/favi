import csv from 'fast-csv';

import {
  respHeaders,
  s3,
  sns,
} from '../lib/common';

export const handler = (event, context, callback) => {
  if (event.httpMethod === 'OPTIONS') {
    callback(null, {
      statusCode: 204,
      headers: respHeaders,
    });
  }

  const { apiKey } = event.requestContext.identity;

  if (apiKey !== process.env.FAVI_SEED_KEY) {
    callback(null, {
      statusCode: 403,
      body: JSON.stringify({
        message: 'Forbidden',
      }),
      headers: respHeaders,
    });
  } else {
    const s3SeedFileParams = { Bucket: 'favi-cache', Key: 'top-1m.csv' };
    const s3SeedCursorFileParams = { Bucket: 'favi-cache', Key: 'seed-cursor.txt' };

    let cursor;
    s3.getObject(s3SeedCursorFileParams, (getErr, data) => {
      if (getErr) {
        console.log(getErr, getErr.stack);
        context.fail(getErr);
      } else {
        cursor = parseInt(data.Body.toString('utf-8'), 10) || 1;
        const endCursor = cursor + 100;

        console.log(`seed cursor start=${cursor} end=${endCursor}`);

        let count = 0;
        let errors = 0;

        const stream = s3.getObject(s3SeedFileParams).createReadStream();

        const snsArn = process.env.SNS_TOPIC_ARN;
        const csvStream = csv
          .parse()
          .validate((csvrow) => {
            const i = csvrow[0];

            return i >= cursor && i <= endCursor;
          })
          .on('data', (csvrow) => {
            console.log('validated row:');
            console.log(csvrow);

            const messageParams = {
              TopicArn: snsArn,
              Message: `http://${csvrow[1]}`,
            };

            sns.publish(messageParams, (pubErr, pubData) => {
              if (pubErr) {
                console.log(pubErr, pubErr.stack);
                errors += 1;
              } else {
                console.log(pubData);
                count += 1;
              }
            });
          })
          .on('end', () => {
            console.log('done parsing');

            s3SeedCursorFileParams.Body = endCursor.toString();

            s3.putObject(s3SeedCursorFileParams, (putErr) => {
              if (putErr) {
                console.log(putErr, putErr.stack); // an error occurred
                context.fail(putErr);
              } else {
                console.log(`saved cursor as ${endCursor}`);

                callback(null, {
                  statusCode: 202,
                  body: JSON.stringify({
                    errors,
                    count,
                    cursor_start: cursor,
                    cursor_end: endCursor,
                  }),
                  headers: respHeaders,
                });
              }
            });
          });

        stream.pipe(csvStream);
      }
    });
  }
};
