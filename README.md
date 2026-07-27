# Augusta National Home Watch

Installable mobile web app that tracks active for-sale listings within 5 miles of
Augusta National Golf Club (33.5030, -82.0199).

## How it works
- `.github/workflows/update-listings.yml` runs daily (~7am ET) via GitHub Actions,
  also runnable manually from the Actions tab.
- It calls the RentCast `/listings/sale` API and writes `data.json` + `seen-ids.json`.
- Listings not seen on the previous run are flagged `isNew` and shown in a
  "New Since Last Check" section at the top of the app.
- `index.html` / `app.js` / `style.css` render the app; it's a PWA (`manifest.json`)
  so it can be added to an iPhone home screen from Safari.

## One-time setup required
1. Repo Settings -> Secrets and variables -> Actions -> New repository secret
   named `RENTCAST_API_KEY` with your RentCast API key.
2. Repo Settings -> Pages -> Source: Deploy from a branch -> Branch: `main` / `(root)`.
3. Actions tab -> "Update Listings" workflow -> Run workflow (first manual run,
   since data.json doesn't exist until it runs once).

## Adjusting
- Radius / coordinates: `scripts/fetch-listings.js` (`LAT`, `LON`, `RADIUS`).
- Schedule: cron line in `.github/workflows/update-listings.yml`.
- Filters (price, property type, beds): add query params in `fetch-listings.js`,
  see RentCast API docs for `/listings/sale`.
