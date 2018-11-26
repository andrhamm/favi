import {
  dynamodb,
} from '../lib/common';

export const handler = (event, context) => {
  console.log('createFaveBatch func');

  const batchWriteItems = [];
  const createdAt = { N: new Date().getTime().toString() };

  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < event.Records.length; index++) {
    const record = event.Records[index];

    console.log(record.Sns.Message);

    batchWriteItems.push({
      PutRequest: {
        Item: {
          hostname: { S: record.Sns.Message },
          created_at: createdAt,
        },
      },
    });
  }

  const params = {
    RequestItems: {
      FaveRecords: batchWriteItems,
    },
  };

  dynamodb.batchWriteItem(params, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      context.fail(err);
    } else {
      if (data.UnprocessedItems) {
        // eslint-disable-next-line no-plusplus
        for (let index = 0; index < data.UnprocessedItems.length; index++) {
          const item = data.UnprocessedItems[index];
          console.log(`Unproccessed Item: ${JSON.stringify(item)}`);
        }
      }
      context.succeed();
    }
  });
};
