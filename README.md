
## Install

```
yarn install # or `npm install`
```

## Deploy Function
```
$ serverless deploy
```

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


## TODO

* Implement some lambdas in Ruby, Optimize packaging of gems