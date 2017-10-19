const AWS = require ('aws-sdk');

var dynamodb = new AWS.DynamoDB ({apiVersion: '2012-08-10'});

module.exports.createFaveBatch = function (event, context, callback) {
  console.log ('createFaveBatch func');

  var batchWriteItems = [];
  var createdAt = {N: new Date ().getTime ().toString ()};

  for (var index = 0; index < event.Records.length; index++) {
    var record = event.Records[index];

    console.log(record.Sns.Message);

    batchWriteItems.push ({
      PutRequest: {
        Item: {
          hostname: {S: record.Sns.Message},
          created_at: createdAt,
        },
      },
    });
  }

  var params = {
    RequestItems: {
      FaveRecords: batchWriteItems,
    },
  };

  dynamodb.batchWriteItem (params, function (err, data) {
    if (err) {
      console.log (err, err.stack);
      context.fail (err);
    } else {
      if (data.UnprocessedItems) {
        for (var index = 0; index < data.UnprocessedItems.length; index++) {
          var item = data.UnprocessedItems[index];
          console.log ('Unproccessed Item: ' + JSON.stringify (item));
        }
      }
      context.succeed ();
    }
  });
};
