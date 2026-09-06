# ICT CMAC - Documentation Service Request System

A Next.js App Router application for managing CMAC and PMAC documentation requests across school units.

## Highlights

- Role-based access for `SECRETARY`, `CMAC_COORDINATOR`, and `ICT_DIRECTOR`
- Multi-step request submission flow
- Coordinator and director approval workflow
- Shared event calendar with conflict detection
- Dashboard and notifications for request activity
- Prisma + MySQL persistence
- NextAuth credential-based authentication

## Tech Stack

- Next.js 16
- React 18
- TypeScript
- Tailwind CSS
- Prisma
- MySQL
- NextAuth

## Getting Started

### Prerequisites

- Node.js 22 (matches CI and Docker; Next.js requires at least 20.9)
- npm
- MySQL database
- ClamAV scanner for file uploads

### Install

```bash
npm install
```

### Environment

Create a `.env` file with at least:

```bash
DATABASE_URL="mysql://root@127.0.0.1:3306/ict_cmac"
NEXTAUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
SERVER_ACTION_ALLOWED_ORIGINS="localhost:3000,127.0.0.1:3000"
CLAMAV_HOST="127.0.0.1"
CLAMAV_PORT="3310"
CLAMAV_TIMEOUT_MS="30000"
```

If you are using XAMPP's default local MySQL, `root` usually has no password, which matches the example above.

### Database

If you do not already have MySQL and ClamAV running locally, start the bundled containers first:

```bash
docker compose up -d db clamav
```

```bash
npx prisma generate
npx prisma db push
```

Optional seed:

```bash
npx prisma db seed
```

### Run

```bash
npm run dev
```

Open `http://localhost:3000`.

### PMAC file storage and workflow review

PMAC uploads now live in `private/uploads/pmac`, outside the public web root. Back up this directory alongside the database. Docker Compose persists new uploads in the `ict-cmac-pmac-uploads` volume. Upload files are excluded from Git and Docker build context.

Existing `/uploads/pmac/...` links are handled by the Next.js proxy and an authenticated, record-scoped download route; historical files are not moved or deleted. Do not configure a reverse proxy/CDN to serve that directory directly, bypassing Next.js. Preserve existing `public/uploads/pmac` files when deploying an upgrade, and include them in backups until migrated separately.

See [the implementation checklist and review](docs/workflow-hardening-review.md) for the changes, causes, tests, and manual acceptance checks.

## Available Scripts

- `npm run dev` - start the dev server
- `npm run build` - create a production build
- `npm run start` - run the production build
- `npm run lint` - run ESLint

## Docker

Build and run the app container:

```bash
docker compose up --build
```

The container expects these environment variables:

```bash
DATABASE_URL="mysql://root:root@127.0.0.1:3306/ict_cmac"
NEXTAUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
SERVER_ACTION_ALLOWED_ORIGINS="localhost:3000,127.0.0.1:3000"
```

Optional container startup flags:

```bash
PRISMA_SKIP_DB_PUSH=0
PRISMA_RUN_SEED=0
```

By default `docker compose` starts a local MySQL service named `db`, and the app container points Prisma at that service automatically.
It also starts the official ClamAV service and waits for its virus definitions and daemon health check before starting the app. Uploads fail closed when ClamAV is missing, unavailable, times out, or returns an invalid response; rejected files are never persisted.
The container also runs `prisma db push` before starting Next.js so the schema stays in sync with the configured database.
The container keeps the same runtime contract as the non-Docker app: `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` must be provided. `docker compose` loads them from `.env`, and the entrypoint fails fast if any required value is missing.

After deploying the CMAC-to-PMAC fulfillment workflow for the first time, reconcile existing approved PMAC requests once:

```bash
npm run backfill:pmac-handoffs
```

Vercel uses the build command in `vercel.json` to apply additive Prisma schema updates before creating the Next.js build. Ensure `DATABASE_URL` is configured for every Vercel environment that can deploy this application.

### Malware scanner deployment

The upload routes use ClamAV's `INSTREAM` protocol. Configure `CLAMAV_HOST`, with optional `CLAMAV_PORT` and `CLAMAV_TIMEOUT_MS`, in every environment that accepts uploads. For a scanner behind a TLS proxy, set `CLAMAV_TLS=true` and optionally `CLAMAV_SERVER_NAME` for certificate verification.

Raw ClamAV TCP traffic is unauthenticated and unencrypted. Keep port `3310` on a private network; the bundled Docker configuration exposes it only on `127.0.0.1`. Serverless deployments such as Vercel need a private or TLS-protected scanner endpoint and must never expose `clamd` directly to the public internet.

## Main Routes

- `/` - dashboard
- `/requests` - request list and approval actions
- `/new-request` - request submission flow
- `/calendar` - event calendar
- `/analytics` - coordinator/director analytics
- `/logs` - coordinator audit log view
- `/admin` - director user management
- `/profile` - profile and password updates

## Notes

- Secretaries can submit requests and follow their own request progress.
- Coordinators handle first-level review.
- Directors can finalize approvals and create direct calendar entries.
- Calendar conflict checks run both in the UI and on the server before creation.
