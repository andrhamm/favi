import {
  respHeaders,
  lambda,
} from '../lib/common';

export const handler = (event, context, callback) => {
  if (event.httpMethod === 'OPTIONS') {
    callback(null, {
      statusCode: 204,
      headers: respHeaders,
    });
  }

  console.log('streamFaves func');
  console.log(event);

  const reqBody = JSON.parse(event.body);

  let channel;
  if (reqBody && reqBody.channel) {
    // eslint-disable-next-line prefer-destructuring
    channel = reqBody.channel;
  } else {
    callback(null, {
      statusCode: 422,
      body: JSON.stringify({
        message: 'Missing or invalid channel',
      }),
      headers: respHeaders,
    });
  }

  lambda.invoke(
    {
      FunctionName: 'favi-dev-notifyPusherAll', // TODO: respect multiple envs
      Payload: JSON.stringify({
        channel,
      }),
      InvocationType: 'Event',
    },
    (error, data) => {
      if (error) {
        console.log(error, error.stack);
        context.fail(error);
      }

      console.log(data);

      callback(null, {
        statusCode: 202,
        body: JSON.stringify({
          channel,
        }),
        headers: respHeaders,
      });
    },
  );
};
