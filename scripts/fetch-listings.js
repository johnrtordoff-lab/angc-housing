const fs = require('fs');
const path = require('path');

const API_KEY = process.env.RENTCAST_API_KEY;
const LAT = 33.5030;
const LON = -82.0199;
const RADIUS = 5;
// Houses only - excludes raw land parcels, which otherwise dominate results
// near a city center and blow past the API's 500-result cap.
const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Manufactured', 'Multi-Family'];

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const SEEN_PATH = path.join(__dirname, '..', 'seen-ids.json');

async function fetchPage(offset) {
  const params = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    radius: String(RADIUS),
    status: 'Active',
    limit: '500',
    offset: String(offset),
    includeTotalCount: 'true'
  });
  PROPERTY_TYPES.forEach(t => params.append('propertyType', t));

  const res = await fetch(`https://api.rentcast.io/v1/listings/sale?${params.toString()}`, {
    headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json' }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RentCast API error: ${res.status} ${res.statusText}\n${body}`);
  }

  const totalCount = Number(res.headers.get('x-total-count') || '0');
  const page = await res.json();
  return { page, totalCount };
}

async function main() {
  if (!API_KEY) {
    console.error('Missing RENTCAST_API_KEY env var');
    process.exit(1);
  }

  const { page: firstPage, totalCount } = await fetchPage(0);
  let listings = firstPage;

  // Paginate if there's more, but cap at 2 calls total per run to stay
  // comfortably within the free-tier monthly quota on a daily schedule.
  if (totalCount > listings.length && listings.length === 500) {
    console.log(`Total available: ${totalCount}, fetching one more page...`);
    const { page: secondPage } = await fetchPage(500);
    listings = listings.concat(secondPage);
  }

  let seen = [];
  let isFirstRun = true;
  if (fs.existsSync(SEEN_PATH)) {
    isFirstRun = false;
    try {
      seen = JSON.parse(fs.readFileSync(SEEN_PATH, 'utf8'));
    } catch (e) {
      seen = [];
    }
  }
  const seenSet = new Set(seen);
  const currentIds = listings.map(l => l.id);

  const enriched = listings.map(l => ({
    id: l.id,
    address: l.formattedAddress,
    price: l.price,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    sqft: l.squareFootage,
    yearBuilt: l.yearBuilt,
    propertyType: l.propertyType,
    daysOnMarket: l.daysOnMarket,
    listedDate: l.listedDate,
    lat: l.latitude,
    lon: l.longitude,
    mlsName: l.mlsName || null,
    isNew: !isFirstRun && !seenSet.has(l.id)
  }));

  enriched.sort((a, b) => (a.price || 0) - (b.price || 0));

  const data = {
    lastUpdated: new Date().toISOString(),
    center: { lat: LAT, lon: LON, label: 'Augusta National Golf Club' },
    radiusMiles: RADIUS,
    totalAvailable: totalCount,
    count: enriched.length,
    newCount: enriched.filter(l => l.isNew).length,
    listings: enriched
  };

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  fs.writeFileSync(SEEN_PATH, JSON.stringify(currentIds, null, 2));

  console.log(`Updated ${enriched.length} of ${totalCount} total listings, ${data.newCount} new since last check.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
