const SOURCES = {
  houses: './data.json',
  land: './land.json'
};

const cache = {};
let activeTab = 'houses';

async function loadTab(tab) {
  const root = document.getElementById('root');
  const updatedEl = document.getElementById('updated');
  const countEl = document.getElementById('count-total');
  const newEl = document.getElementById('count-new');
  const filterNoteEl = document.getElementById('filter-note');

  filterNoteEl.textContent = tab === 'houses'
    ? '$250,000+ \u00b7 single family, condo, townhouse, manufactured, multi-family'
    : 'Vacant land & lots \u00b7 no price minimum';

  root.innerHTML = '<div class="empty">Loading&hellip;</div>';

  try {
    if (!cache[tab]) {
      const res = await fetch(SOURCES[tab], { cache: 'no-store' });
      if (!res.ok) throw new Error('No data yet');
      cache[tab] = await res.json();
    }
    const data = cache[tab];

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

    if (data.truncated) {
      const note = document.createElement('div');
      note.className = 'truncated-note';
      note.textContent = `Showing ${data.count} of ${data.totalAvailable} available — the free API tier caps how many we can pull per check.`;
      root.appendChild(note);
    }

    if (listings.length === 0) {
      root.innerHTML += '<div class="empty">No active listings found within 3 miles right now.</div>';
      return;
    }

    if (newOnes.length > 0) {
      root.appendChild(sectionTitle('✦ New Since Last Check', true));
      newOnes.forEach(l => root.appendChild(card(l, tab)));
    }

    root.appendChild(sectionTitle('All Active (' + rest.length + (newOnes.length ? ' more' : '') + ')'));
    rest.forEach(l => root.appendChild(card(l, tab)));

  } catch (err) {
    root.innerHTML = '<div class="error">Couldn\'t load this yet. The first update runs on the daily/weekly schedule, or trigger it manually from the GitHub Actions tab.</div>';
    updatedEl.textContent = '';
    countEl.textContent = '–';
    newEl.textContent = '–';
  }
}

function sectionTitle(text, isNew) {
  const div = document.createElement('div');
  div.className = 'section-title' + (isNew ? ' new-title' : '');
  div.textContent = text;
  return div;
}

function card(l, tab) {
  const div = document.createElement('div');
  div.className = 'card' + (l.isNew ? ' is-new' : '');

  const price = l.price ? '$' + l.price.toLocaleString('en-US') : 'Price N/A';
  const meta = [];

  if (tab === 'land') {
    if (l.lotSize) meta.push(l.lotSize.toLocaleString('en-US') + ' sqft lot');
  } else {
    if (l.bedrooms != null) meta.push(l.bedrooms + ' bd');
    if (l.bathrooms != null) meta.push(l.bathrooms + ' ba');
    if (l.sqft) meta.push(l.sqft.toLocaleString('en-US') + ' sqft');
  }
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

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    loadTab(activeTab);
  });
});

loadTab(activeTab);
