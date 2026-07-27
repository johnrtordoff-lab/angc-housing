const fs = require('fs');

const LAT = 33.5030;
const LON = -82.0199;
const RADIUS = 5;

// Haversine distance in miles.
function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

async function fetchPage(apiKey, propertyTypes, offset) {
  const params = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    radius: String(RADIUS),
    status: 'Active',
    limit: '500',
    offset: String(offset),
    includeTotalCount: 'true'
  });
  propertyTypes.forEach(t => params.append('propertyType', t));

  const res = await fetch(`https://api.rentcast.io/v1/listings/sale?${params.toString()}`, {
    headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RentCast API error: ${res.status} ${res.statusText}\n${body}`);
  }

  const totalCount = Number(res.headers.get('x-total-count') || '0');
  const page = await res.json();
  return { page, totalCount };
}

// Runs a full fetch + diff + write cycle for one category (houses or land).
// `maxCalls` caps how many 500-result API pages this run will use, so total
// monthly usage across all scheduled scripts stays inside the free tier.
async function runFetch({ label, propertyTypes, maxCalls, dataPath, seenPath }) {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    console.error('Missing RENTCAST_API_KEY env var');
    process.exit(1);
  }

  const { page: first, totalCount } = await fetchPage(apiKey, propertyTypes, 0);
  let raw = first;
  let callsUsed = 1;

  while (callsUsed < maxCalls && raw.length < totalCount && raw.length > 0 && raw.length % 500 === 0) {
    const { page } = await fetchPage(apiKey, propertyTypes, raw.length);
    raw = raw.concat(page);
    callsUsed += 1;
    if (page.length < 500) break;
  }

  const rawCount = raw.length;

  // Hard distance filter - re-verify every listing is actually within
  // RADIUS miles of the course, dropping anything the API mis-included
  // and anything missing coordinates entirely.
  const verified = raw
    .map(l => {
      if (l.latitude == null || l.longitude == null) return null;
      const dist = distanceMiles(LAT, LON, l.latitude, l.longitude);
      return dist <= RADIUS ? { ...l, __distance: dist } : null;
    })
    .filter(Boolean);

  const droppedOutOfRadius = rawCount - verified.length;
  const truncated = totalCount > rawCount;

  let seen = [];
  let isFirstRun = true;
  if (fs.existsSync(seenPath)) {
    isFirstRun = false;
    try {
      seen = JSON.parse(fs.readFileSync(seenPath, 'utf8'));
    } catch (e) {
      seen = [];
    }
  }
  const seenSet = new Set(seen);
  const currentIds = verified.map(l => l.id);

  const enriched = verified.map(l => ({
    id: l.id,
    address: l.formattedAddress,
    price: l.price,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    sqft: l.squareFootage,
    lotSize: l.lotSize,
    yearBuilt: l.yearBuilt,
    propertyType: l.propertyType,
    daysOnMarket: l.daysOnMarket,
    listedDate: l.listedDate,
    distanceMiles: Math.round(l.__distance * 10) / 10,
    lat: l.latitude,
    lon: l.longitude,
    mlsName: l.mlsName || null,
    isNew: !isFirstRun && !seenSet.has(l.id)
  }));

  enriched.sort((a, b) => (a.price || 0) - (b.price || 0));

  const data = {
    label,
    lastUpdated: new Date().toISOString(),
    center: { lat: LAT, lon: LON, label: 'Augusta National Golf Club' },
    radiusMiles: RADIUS,
    totalAvailable: totalCount,
    count: enriched.length,
    newCount: enriched.filter(l => l.isNew).length,
    truncated,
    apiCallsUsed: callsUsed,
    listings: enriched
  };

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  fs.writeFileSync(seenPath, JSON.stringify(currentIds, null, 2));

  console.log(
    `[${label}] ${enriched.length} of ${totalCount} total (${droppedOutOfRadius} dropped as out-of-radius), ` +
    `${data.newCount} new, ${callsUsed} API call(s) used${truncated ? ' [TRUNCATED]' : ''}.`
  );
}

module.exports = { runFetch };
