const path = require('path');
const { runFetch } = require('./lib');

runFetch({
  label: 'land',
  propertyTypes: ['Land'],
  maxCalls: 2, // weekly schedule - up to 2 calls/run keeps this at ~8-9/month
  dataPath: path.join(__dirname, '..', 'land.json'),
  seenPath: path.join(__dirname, '..', 'seen-land-ids.json')
}).catch(err => {
  console.error(err);
  process.exit(1);
});
