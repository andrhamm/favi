## Overview

Front-end app is more or less manually provisioned as an S3-backed CloudFront Web Distribution. It lives in the `app` dir and has its own package management. Deploying the backend app first will stub out some basic resources. In the future I'd like to have more of the front-end app covered with CloudFormation for easier initialization. See DNS Config section for some manual steps to get the endpoints configured.

Back-end app is built on the Serverless framework and manages most of its own resources. Deploying the app will create some AWS resources with potentially nonzero costs associated. Resources automatically managed by the `serverless.yml` configuration include a DynamoDb table and stream, several Lambda functions including a headless browser function for web scraping, S3 buckets and more.

## Install

```
bundle install --path vendor
bundle package
yarn install # or `npm install`
```

## Deploy Backend

From root of this repo

```
$ serverless deploy
```

## Deploy Frontend

From `app` dir of this repo:

```
$ grunt deploy
```

This will upload the front-end assets to S3 and issue an invalidation request to CloudFront. Invalidations can take a few minutes to process.

## Seeding

Download seed data:

```
# This file is ~ 22MB
wget http://s3.amazonaws.com/alexa-static/top-1m.csv.zip .
unzip top-1m.csv.zip
```

Run seed script, optionally specifying a limit (default is 100):

```
ruby seed.rb 300
```

The seed script will start from where it left off if previously ran on the same machine. It does this by writing to a `seed.txt` file with the cursor.

## DNS Config

Deployment of this app assumes you have configured certificates and DNS in AWS Certificate Manager and Route53. This process can take 40+ minutes for AWS to process.

1. Change the custom domain in the `serverless.yml` for your own domain. For this example, I've used `favi-api.andrhamm.com` for the Custom Domain for the API Gateway portion of the project and `favi.andrhamm.com` for the CloudFront (frontend) portion of the app.
2. Request a certificate from Certificate Manager for the above-mentioned subdomains. You will need to verify ownership of the domains/subdomains by clicking links that AWS will send to the email addresses on the domain owner record.
3. In the API Gateway dashboard, navigate to the Custom Domain Names screen and create a new custom domain for your API (I used `favi-api.andrhamm.com`). Be sure to reference the certificate you just created in step 2. Don't worry about adding the Base Path Mapping, as the Serverless Custom Domain plugin will handle that for you on deploy.
4. Edit the front-end code to use your endpoint instead of the hardcoded `favi-api.andrhamm.com`
5. Once AWS finished processing the request, copy the Target Domain Name (cloudfront URL) and go to Route 53 to create a couple aliases. For the applicable Hosted Zone, choose Create Record Set. Use `favi-api` for the Name `A - IPv4 address` as the Type, select Alias `Yes`, and past the Target Domain Name into the Alias Target. Repeat this again but choose `AAAA - IPv6 address` for the Type. You should now have 2 new Alias records for `favi-api`.

You can skip all of this and instead use the API Gateway endpoints generated on deploy, it just doesn't look as nice and might not play nicely with the front-end app (CORS, etc).


## TODO

* Use serverless env vars for aws `profile` config, so others can deploy
* Another lambda on dynamodb stream for saving favicon images to S3
* Cronjob lambda for creating favicon collage
* Implement some lambdas in Ruby, Optimize packaging of gems
* Fallback to using Google's cached favicons if we aren't smart enough to find it (i.e. `http://s2.googleusercontent.com/s2/favicons?domain=github.com`)
* Something fun with [favico.js](http://lab.ejci.net/favico.js/)
* Tighten up IAM role access
* Use serverless env var for bucket name
* Automate certificate manager and custom domain stuff with cloudformation resources if possible
* Automate front-end cloudfront distro with cloudformation in serverless resources
* Clean up API interface, especially output of read endpoint
* Use versioned JS/CSS assets to avoid needing to do CloudFront invalidations
* Add moderation ability to clear record from db and re-queue for scraping