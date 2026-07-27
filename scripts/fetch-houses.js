const path = require('path');
const { runFetch } = require('./lib');

runFetch({
  label: 'houses',
  propertyTypes: ['Single Family', 'Condo', 'Townhouse', 'Manufactured', 'Multi-Family'],
  minPrice: 250000,
  maxCalls: 1, // daily schedule - 1 call/day keeps this at ~30/month
  dataPath: path.join(__dirname, '..', 'data.json'),
  seenPath: path.join(__dirname, '..', 'seen-ids.json')
}).catch(err => {
  console.error(err);
  process.exit(1);
});
