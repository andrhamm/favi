import Pusher from 'pusher';

import {
  dynamodb,
} from '../lib/common';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: 'us2',
  encrypted: true,
});

export const notifyPusher = (event) => {
  console.log('cacheFavicon func');
  console.log(event);

  const events = event.Records;
  // eslint-disable-next-line no-plusplus
  for (let i = 0, len = events.length; i < len; i++) {
    const payload = {};
    payload.type = events[i].eventName;
    payload.data = events[i].dynamodb;

    pusher.trigger(
      'faves',
      'fave-event', // 'fave-' + events[i].eventName.toLowerCase (),
      payload,
    );
  }
};

export const notifyPusherAll = (event, context) => {
  console.log(event);

  const params = {
    ProjectionExpression: 'hostname, favicon_src',
    TableName: 'FaveRecords',
  };

  const channel = `stream-${event.channel}`;

  dynamodb.scan(params, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      context.fail(err);
    } else {
      console.log(
        `Streaming ${data.Items.length} faves to Pusher channel ${channel}`,
      );

      // eslint-disable-next-line no-plusplus
      for (let index = 0; index < data.Items.length; index++) {
        const element = data.Items[index];

        if (element.favicon_src && element.favicon_src.S) {
          console.log(`${element.hostname.S} (${element.favicon_src.S})`);

          pusher.trigger(channel, 'fave-event-stream', element);
        }
      }
    }
  });
};
