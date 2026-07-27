async function load() {
  const root = document.getElementById('root');
  const updatedEl = document.getElementById('updated');
  const countEl = document.getElementById('count-total');
  const newEl = document.getElementById('count-new');

  try {
    const res = await fetch('./data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No data yet');
    const data = await res.json();

    const updated = new Date(data.lastUpdated);
    updatedEl.textContent = 'Updated ' + updated.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    countEl.textContent = data.count;
    newEl.textContent = data.newCount;

    const listings = data.listings || [];
    const newOnes = listings.filter(l => l.isNew);
    const rest = listings.filter(l => !l.isNew);

    root.innerHTML = '';

    if (listings.length === 0) {
      root.innerHTML = '<div class="empty">No active listings found within 5 miles right now.</div>';
      return;
    }

    if (newOnes.length > 0) {
      root.appendChild(sectionTitle('New Since Last Check'));
      newOnes.forEach(l => root.appendChild(card(l)));
    }

    root.appendChild(sectionTitle('All Active Listings (' + rest.length + (newOnes.length ? ' more' : '') + ')'));
    rest.forEach(l => root.appendChild(card(l)));

  } catch (err) {
    root.innerHTML = '<div class="error">Couldn\'t load listings yet. The first update runs on the daily schedule, or trigger it manually from the GitHub Actions tab.</div>';
    updatedEl.textContent = '';
  }
}

function sectionTitle(text) {
  const div = document.createElement('div');
  div.className = 'section-title';
  div.textContent = text;
  return div;
}

function card(l) {
  const div = document.createElement('div');
  div.className = 'card' + (l.isNew ? ' is-new' : '');

  const price = l.price ? '$' + l.price.toLocaleString('en-US') : 'Price N/A';
  const meta = [];
  if (l.bedrooms != null) meta.push(l.bedrooms + ' bd');
  if (l.bathrooms != null) meta.push(l.bathrooms + ' ba');
  if (l.sqft) meta.push(l.sqft.toLocaleString('en-US') + ' sqft');
  if (l.propertyType) meta.push(l.propertyType);
  if (l.distanceMiles != null) meta.push(l.distanceMiles + ' mi from ANGC');
  if (l.daysOnMarket != null) meta.push(l.daysOnMarket + 'd on market');

  const mapQuery = encodeURIComponent(l.address || '');

  div.innerHTML = `
    <div class="card-top">
      <div class="price">${price}</div>
      ${l.isNew ? '<div class="badge">New</div>' : ''}
    </div>
    <div class="address">${l.address || 'Address unavailable'}</div>
    <div class="meta">${meta.map(m => `<span>${m}</span>`).join('')}</div>
    <a class="map-link" href="https://www.google.com/search?q=${mapQuery}" target="_blank" rel="noopener">Search this address &rarr;</a>
  `;
  return div;
}

load();
