import {
  sns,
} from '../lib/common';

export const handler = async (event) => {
  console.log('scrapeDynamoToSns func');
  console.log(event);

  const snsArn = process.env.SNS_TOPIC_ARN;
  const events = event.Records;

  // eslint-disable-next-line no-plusplus
  for (let i = 0, len = events.length; i < len; i++) {
    if (events[i].eventName === 'INSERT') {
      const hostname = events[i].dynamodb.Keys.hostname.S.trim();

      const messageParams = {
        TopicArn: snsArn,
        Message: hostname,
      };

      // eslint-disable-next-line no-await-in-loop
      const data = await sns.publish(messageParams).promise();

      console.log(data);
    }
  }
};
