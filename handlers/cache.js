export const handler = (event) => {
  console.log('cacheFavicon func');
  console.log(event);

  const events = event.Records;
  // eslint-disable-next-line no-plusplus
  for (let i = 0, len = events.length; i < len; i++) {
    if (events[i].eventName === 'MODIFY') {
      const hostname = events[i].dynamodb.Keys.hostname.S;

      if (
        events[i].dynamodb.OldImage.favicon_src === undefined
        && events[i].dynamodb.NewImage.favicon_src
      ) {
        console.log(
          `New favicon URL detected for ${
            hostname
          }: ${
            JSON.stringify(events[i])}`,
        );

        // TODO: download favicon image file and write to S3 cache
      }
    }
  }
};
