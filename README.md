# School Library Management System

React + Vite frontend in JSX with simple CSS, plus a Node/Express backend that auto-connects to PostgreSQL through Supabase-compatible environment variables. If no PostgreSQL connection is available locally, the backend falls back to in-memory storage so you can run the app without installing Postgres on your machine.

## Layout

- `frontend/` - Vite app
- `backend/` - Express API and database bootstrap
- `api/` - Vercel serverless entrypoint that reuses the backend app

## Environment

Backend database connection uses one of these:

- `DATABASE_URL`
- `SUPABASE_DB_URL`
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

Frontend API base defaults to `/api` so it works locally with a proxy and on Vercel with the serverless route.

If you do not have PostgreSQL installed locally, that is fine. The backend will boot with in-memory data for local development. For persistence in production, set `DATABASE_URL` or `SUPABASE_DB_URL` to your Supabase database connection string.

If you want to add Supabase first, do this before deploying:

1. Create a Supabase project.
2. Copy the PostgreSQL connection string from Supabase into `DATABASE_URL` or `SUPABASE_DB_URL`.
3. Put the same value in Vercel environment variables.
4. Redeploy so the backend initializes the tables in Supabase instead of using memory fallback.
5. Keep local development on memory fallback unless you also set the same env var in a local `.env` file.

## Supabase first setup

Use this flow if you want Supabase ready before you publish on Vercel:

1. Create a new Supabase project.
2. Open the SQL editor in Supabase.
3. Run the schema from [supabase/schema.sql](supabase/schema.sql).
4. Copy the database connection string from Supabase.
5. Add it to your Vercel project as `DATABASE_URL` or `SUPABASE_DB_URL`.
6. If you want local persistence too, create `backend/.env` with the same connection string.
7. Restart the backend locally, then verify the dashboard loads issued books from Supabase.
8. Deploy to Vercel after the local check passes.

### Vercel env vars

Add these in your Vercel project settings:

- `DATABASE_URL` or `SUPABASE_DB_URL`
- `NODE_ENV=production`

### Local `.env` example

Create `backend/.env` if you want to use Supabase locally:

```env
PORT=3001
DATABASE_URL=your-supabase-postgres-connection-string
```

### What happens at runtime

- With a Supabase connection string present, the backend connects to PostgreSQL and creates the tables automatically.
- Without one, the backend runs in memory so you can keep developing without local Postgres.
- On Vercel, the API route uses the same backend code path, so the same env vars work there too.

## Run locally

1. Install dependencies in `frontend/` and `backend/`.
2. Start the backend on port `3001`.
3. Start the Vite frontend on port `5173`.
4. Add Supabase env vars before deploying to Vercel if you want persistent storage.

## Notes

- The urgent reminder panel is closable.
- The issued-books table uses a merged second row with a full-width progress bar.
- Books, languages, and sub-categories are seeded from the library collection you provided.