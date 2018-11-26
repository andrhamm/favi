import AWS from 'aws-sdk';

export const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
export const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
export const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
export const lambda = new AWS.Lambda({ region: 'us-east-1' });

export const respHeaders = {
  // for CORS... later
  'Access-Control-Allow-Credentials': false,
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
  'Access-Control-Allow-Origin': 'https://favi.andrhamm.com',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
