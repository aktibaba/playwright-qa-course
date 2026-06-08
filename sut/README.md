# Inkwell

> A small **React (Vite) + Express.js + Sequelize + PostgreSQL** blogging app —
> articles, comments, tags, follow/favorite, JWT auth. It exists as the
> **system under test (SUT)** for the Playwright + TypeScript QA automation course.

The app is intentionally simple and deterministic so that automated tests never
race startup or fight non-reproducible data:

- **HashRouter** front end — the pathname is always `/`, so direct navigation
  (`/#/login`) is stable and client-side routing is predictable.
- **Test-only reset/seed endpoints** (`POST /api/test/reset`, `POST /api/test/seed`),
  mounted only when `ENABLE_TEST_ENDPOINTS=1`, so every run starts from known data.
- **One-command Docker stack** that comes up only once every healthcheck is green.

## Run it (Docker — recommended)

```bash
docker compose up -d --build --wait
```

| Service | URL |
|---------|-----|
| Web (SPA) | http://localhost:3000 |
| API       | http://localhost:3001/api |

Tear down (drop the database volume too):

```bash
docker compose down -v
```

## Test endpoints

Enabled only when `ENABLE_TEST_ENDPOINTS=1` (set in `docker-compose.yml`).

| Method & path           | Purpose |
|-------------------------|---------|
| `POST /api/test/reset`  | Drop, recreate, and reseed the database with known data. Returns the seeded users + article. |
| `POST /api/test/seed`   | Create extra users on demand without wiping existing data. Body: `{ "users": [{ "username", "email", "password", "bio?" }] }`. |
| `GET  /api/test/health` | Readiness probe. |

### Seed data

After a reset, three users exist (all password `Password123!`):

| username   | email               |
|------------|---------------------|
| playwright | playwright@test.io  |
| alice      | alice@test.io       |
| bob        | bob@test.io         |

…plus one article, `welcome-to-inkwell` (authored by `alice`).

```bash
curl -X POST http://localhost:3001/api/test/reset
```

## Run it (without Docker)

Requires Node.js `v18.11.0+` and a reachable SQL database. Configure the
variables in [`backend/.env.example`](backend/.env.example), then:

```bash
npm install
npm run dev          # API on :3001, Vite dev server on :3000
```

## License

MIT — see [LICENSE](LICENSE).
