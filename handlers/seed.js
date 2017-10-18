const AWS = require ('aws-sdk');

var dynamodb = new AWS.DynamoDB ({apiVersion: '2012-08-10'});

module.exports.createFaveBatch = function (event, context, callback) {
    console.log ('createFaveBatch func');

    event.Records.forEach(function(record) {
        // Kinesis data is base64 encoded so decode here
        var payload = new Buffer(record.kinesis.data, 'base64').toString('ascii');
        console.log('Decoded payload:', payload);
    });

    callback.succeed();
}