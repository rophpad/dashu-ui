# Dashu UI

A ready-to-run Next.js interface powered exclusively by the published Dashu SDK packages for core orchestration, Next.js routes, PostgreSQL, managed AI, OpenRouter, and local OpenAI-compatible models.

## Quick start

```bash
git clone <your-repository-url>
cd dashu-ui
npm install
cp .env.example .env
npm run dev
```

Configure only these variables:

```env
DASHU_DATABASE_URL=postgres://readonly_user:password@host:5432/analytics
DASHU_STORAGE_DATABASE_URL=
DASHU_CLOUD_URL=https://dashu.vercel.app
DASHU_CLOUD_CREDENTIAL=your-installation-token
```

- `DASHU_DATABASE_URL` is the read-only PostgreSQL database Dashu queries.
- `DASHU_STORAGE_DATABASE_URL` is optional. When set, users, credentials, conversations, saved queries, dashboards, and settings are stored in its `dashu_ui_documents` table.
- If the storage URL is empty, the same application data is stored as private JSON files in `.dashu/`.
- `DASHU_CLOUD_URL` defaults to `https://dashu.vercel.app`.
- `DASHU_CLOUD_CREDENTIAL` stays server-side and enables managed AI and Pro features. Users never enter a license key or AI credential in the UI.

The published `@rophpad/dashu-provider-openrouter` and `@rophpad/dashu-provider-openai-compatible` adapters are direct dependencies, so no extra installation is required for OpenRouter, Ollama, vLLM, LocalAI, llama.cpp, or another OpenAI-compatible endpoint. This ready-to-run four-variable configuration selects `@rophpad/dashu-provider-managed`; changing provider selection later only requires wiring one of the already-installed package adapters, not implementing a provider in this UI.

Open `http://localhost:3000`. The first visitor creates the initial user account.

## Docker

```bash
docker compose up --build -d
```

Docker publishes port `3000` and persists JSON fallback storage in the `dashu-data` volume. HTTPS session cookies are detected automatically from the request or reverse proxy headers.

## Validate

```bash
npm run typecheck
npm run build
```
