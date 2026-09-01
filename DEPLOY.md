# Deploying Supply Chain Analytics

Three pieces: **Postgres** (data) → **FastAPI backend** (Render) → **Next.js frontend** (Vercel).

Steps marked **(you)** need your own browser login and can't be done from
here — everything else has been prepared for you already.

## 0. Push the code to GitHub (you)

This repo has been initialized locally with a first commit. To push it:

1. Create a new empty repository on GitHub (no README/license — this repo already has files): https://github.com/new
2. Then run, from `c:\Users\kali_\Downloads\project_bundle`:
   ```
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
   Git for Windows will pop up a browser window to sign in the first time — that's expected.

## 1. Backend + database on Render (you, then me)

1. Go to https://dashboard.render.com → **New** → **Blueprint**, and point it at your
   GitHub repo. Render will read `render.yaml` at the repo root and create:
   - a free Postgres database (`supply-chain-db`)
   - a free web service (`supply-chain-api`) running the FastAPI app from `project/api/`
2. Once both are created, open the **supply-chain-api** service and copy its public URL
   (looks like `https://supply-chain-api-xxxx.onrender.com`) — you'll need it for step 2.
3. Open the **supply-chain-db** database page and copy the **External Database URL**
   (or the individual host/port/user/password fields) — you'll need this to load data (step 3).

Note: Render's free Postgres is deleted after 30 days of inactivity on the free plan —
fine for a demo, but don't rely on it for anything long-lived.

## 2. Load the schema + data into the new database

Once you have the Render Postgres connection details, give them to me (or run this
yourself) — from the repo root:

```
cd project/sql
cat 01_create_tables.sql \
    analytics/04_sales_demand_view.sql \
    analytics/06_inventory_analysis.sql \
    analytics/09_logistics_analysis_view.sql \
    analytics/11_returns_analysis_view.sql \
    analytics/12_executive_dashboard_view.sql \
    analytics/13_procurement_analysis_view.sql \
    > /tmp/bootstrap.sql
psql "<Render External Database URL>" -f /tmp/bootstrap.sql
```

Then load the data (from `project/src`), pointing at the same database:

```
cd project/src
PGHOST=<render host> PGPORT=<render port> PGDATABASE=<render db> \
PGUSER=<render user> PGPASSWORD=<render password> \
python load_to_postgres.py --data-dir ../data/cleaned
```

## 3. Frontend on Vercel (you)

1. Go to https://vercel.com/new and import the same GitHub repo.
2. Set **Root Directory** to `frontend` (important — the Next.js app lives in a subfolder).
3. Add an environment variable:
   - `NEXT_PUBLIC_API_URL` = the Render backend URL from step 1 (no trailing slash)
4. Deploy. Vercel gives you a `https://your-app.vercel.app` URL.

## 4. Close the loop: CORS

The backend only allows requests from specific origins. Once you have your Vercel URL:

1. In the Render dashboard, open **supply-chain-api** → **Environment**.
2. Set `ALLOWED_ORIGINS` to your Vercel URL, e.g. `https://your-app.vercel.app`
   (comma-separate multiple origins if you add a custom domain later).
3. Render redeploys automatically on env var change.

## Verifying it worked

- `https://<render-url>/` should return `{"message": "Supply Chain Analytics API is running"}`
- `https://<your-app>.vercel.app` should load the dashboard with real data
- If charts show no data, check the browser console for CORS errors — that means
  step 4 (`ALLOWED_ORIGINS`) wasn't set to the exact Vercel URL.
