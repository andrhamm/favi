import phantomjsLambdaPack from 'phantomjs-lambda-pack';
import {
  dynamodb,
} from '../lib/common';

const { exec } = phantomjsLambdaPack.exec;

export const handler = (event, context) => {
  console.log('scrapeFavicon func');
  console.log(event);

  const events = event.Records;
  // eslint-disable-next-line no-plusplus
  for (let i = 0, len = events.length; i < len; i++) {
    const hostname = events[i].Sns.Message;

    console.log(
      `INSERT event for hostname ${
        hostname
      }: ${
        JSON.stringify(events[i])}`,
    );

    exec(
      [`${__dirname}/phantom-scraper.js`, hostname],
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }

        console.log(`favicon url: ${stdout.trim()}`);
        console.log(`stderr should be empty: ${stderr}`);

        // TODO: handle errors for real
        const faviconSrc = stdout.startsWith('http') ? stdout.trim() : 'null';

        const updateItem = {
          TableName: 'FaveRecords',
          ExpressionAttributeNames: {
            '#F': 'favicon_src',
            '#U': 'updated_at',
          },
          ExpressionAttributeValues: {
            ':f': {
              S: faviconSrc,
            },
            ':u': {
              S: new Date().getTime().toString(),
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

        dynamodb.updateItem(updateItem, (err) => {
          if (err && err.code !== 'ConditionalCheckFailedException') {
            // TODO: catch errors when trying to insert the same item
            // and return different status code with existing doc
            console.log(err, err.stack);
            context.fail(err);
          }

          context.succeed();
        });
      },
    );
  }
};
