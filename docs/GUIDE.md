# Dashu UI operator guide

Dashu UI is a self-hosted Next.js application powered by the published `@rophpad/dashu-*` packages. Managed AI, OpenRouter, and local OpenAI-compatible provider adapters are installed directly; no provider implementation lives in this repository.

## Configuration

Copy `.env.example` to `.env` and configure only:

```env
DASHU_DATABASE_URL=postgres://readonly_user:password@host:5432/analytics
DASHU_STORAGE_DATABASE_URL=
DASHU_CLOUD_URL=https://dashu.vercel.app
DASHU_CLOUD_CREDENTIAL=your-installation-token
```

### Analytics database

`DASHU_DATABASE_URL` is required. Dashu introspects and queries the PostgreSQL `public` schema. Use a dedicated role with `CONNECT`, schema `USAGE`, and `SELECT` on the intended tables and views. Change the variable and restart Dashu to connect to another database.

### Application storage

`DASHU_STORAGE_DATABASE_URL` is optional. When set, Dashu creates `dashu_ui_documents` and stores user records, password hashes, session secrets, conversations, saved queries, dashboards, and settings there. The role therefore needs permission to create and update that table.

When unset, equivalent private JSON documents are written to `.dashu/`. Docker persists this directory through the `dashu-data` volume.

### Dashu Cloud

`DASHU_CLOUD_URL` defaults to `https://dashu.vercel.app`. `DASHU_CLOUD_CREDENTIAL` is a backend-only installation credential for managed AI and Pro features. Users do not enter license or provider keys in the UI.

Database credentials and result rows remain on the UI server. Managed AI receives the question and schema context required to generate SQL.

The four-variable distribution uses `@rophpad/dashu-provider-managed`. The installed `@rophpad/dashu-provider-openrouter` and `@rophpad/dashu-provider-openai-compatible` packages are available for deployments that later add provider-selection configuration.

## Accounts

The first visitor creates the initial account through the UI. User information and password hashes use the configured storage database or JSON fallback. Session cookies automatically use the secure flag when Dashu is reached over HTTPS, including through a reverse proxy that sends `X-Forwarded-Proto`.

## Run

```bash
npm install
npm run dev
```

Or:

```bash
docker compose up --build -d
```

## Validate

```bash
npm run typecheck
npm run build
```
