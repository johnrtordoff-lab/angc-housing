# Augusta National Home Watch

Installable mobile web app tracking active for-sale properties within 3 miles of
Augusta National Golf Club (33.5030, -82.0199), verified by hard distance check
(not just relying on the API's own radius filter).

Two tabs:
- **Houses** — single family, condo, townhouse, manufactured, multi-family
- **Land & Lots** — vacant land parcels

## How it works
- `.github/workflows/update-houses.yml` runs daily (~7am ET), writes `data.json`.
  Capped at 1 API call/run (~30 calls/month).
- `.github/workflows/update-land.yml` runs weekly (Sundays ~7am ET), writes
  `land.json`. Capped at 2 API calls/run (~8-9 calls/month).
- Combined worst case stays under RentCast's 50 calls/month free tier.
- Each writes a `seen-*.json` file to diff against next run and flag new
  listings (`isNew`) in a "New Since Last Check" section.
- `index.html` / `app.js` / `style.css` render the app; it's a PWA
  (`manifest.json`) so it can be added to an iPhone home screen from Safari.
- Both workflows can also be run manually from the Actions tab.

## One-time setup required
1. Repo Settings -> Secrets and variables -> Actions -> New repository secret
   named `RENTCAST_API_KEY` with your RentCast API key.
2. Repo Settings -> Pages -> Source: Deploy from a branch -> Branch: `main` / `(root)`.
3. Actions tab -> run "Update Houses" and "Update Land" once each manually.

## Adjusting
- Radius / coordinates: `scripts/lib.js` (`LAT`, `LON`, `RADIUS`).
- Property types per tab / call budget: `scripts/fetch-houses.js`,
  `scripts/fetch-land.js` (`propertyTypes`, `maxCalls`).
- Schedules: cron lines in `.github/workflows/*.yml`.
- Other filters (price, beds): add query params in `scripts/lib.js`
  `fetchPage()`, see RentCast API docs for `/listings/sale`.
