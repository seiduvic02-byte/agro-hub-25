# Agro Hub local development

This guide is for the clean GitHub export. It contains **no working database or OAuth credentials**; the `.env.example` file contains placeholders only.

## Requirements

- Node.js 22 LTS (the container uses Node 22).
- Corepack with pnpm **10.18.0** (`package.json` pins this version).
- A disposable MySQL database for local development. Do not connect a local checkout to production.

## 1. Extract, install, and create a local database

From a terminal:

```bash
unzip agrohub_clean_github_export_20261004.zip
cd agrohub_clean_github_export_20261004
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install --frozen-lockfile
```

Create an empty database and a local-only MySQL user, for example:

```sql
CREATE DATABASE agrohub_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'agrohub_dev'@'127.0.0.1' IDENTIFIED BY 'choose-a-local-password';
GRANT ALL PRIVILEGES ON agrohub_dev.* TO 'agrohub_dev'@'127.0.0.1';
```

Use a MySQL version compatible with `mysql2` and Drizzle. If a password contains URL-reserved characters (`@`, `:`, `/`, `#`, `%`), percent-encode them in the connection URL.

## 2. Create your private environment file

```bash
cp .env.example .env
```

Edit `.env` and replace the local database password in `DATABASE_URL`, for example:

```dotenv
DATABASE_URL=mysql://agrohub_dev:YOUR_LOCAL_PASSWORD@127.0.0.1:3306/agrohub_dev
```

`server/_core/index.ts` loads the root `.env` with `dotenv/config`. The migration config (`drizzle.config.ts`) and the app's database service both read **`DATABASE_URL`**. Confirm this URL points only to your empty local development database before applying migrations.

### Environment variables by purpose

| Variable | Purpose | Handling |
|---|---|---|
| `DATABASE_URL` | MySQL connection for the app and Drizzle migrations | Required for database-backed local testing; keep private and use local DB only. |
| `MANUS_PROJECT_ID` | Identifies the OAuth project | Needed for Manus sign-in; obtain from the authorized project configuration. |
| `MANUS_OAUTH_PORTAL_URL` | Browser-side Manus login portal base URL | Needed for the sign-in button. |
| `MANUS_OAUTH_API_URL` | Server-side OAuth token/user-info API base URL | Needed for the OAuth callback. |
| `MANUS_JWT_SECRET` | Signs and verifies Agro Hub session cookies | Secret; never expose to the browser or commit it. |
| `MANUS_API_URL`, `MANUS_API_KEY` | Optional server integrations (e.g., map/media/LLM/transcription) | API key is server-only; features needing the integration will be unavailable without it. |
| `MANUS_API_BROWSER_KEY` | Browser-scoped/public platform key | It is intentionally on the public configuration allowlist; use only the public-scoped value. |
| `OWNER_OPEN_ID` | Optional platform owner bootstrap for admin role | Leave blank unless the authorized owner deliberately configures it locally. It is not a password or a general role-grant mechanism. |
| `PUBLIC_SITE_URL` | HTTPS canonical origin for production SEO/sitemap | Leave unset on localhost; the app rejects non-HTTPS origins. Set only for an owned, deployed domain. |
| `PUBLIC_OG_IMAGE_URL` | Optional social-preview image URL | Not required for local development. |

Do not paste credentials into chat, source code, screenshots, or GitHub. Obtain required OAuth/API values through the authorized project owner or secret manager. Local OAuth additionally requires the exact local callback URL, `${origin}/api/oauth/callback`, to be permitted by the OAuth project. Without that provider configuration, the site can render locally but real Manus sign-in will not complete. Do not disable server-side authentication to work around it.

## 3. Apply schema and run the app

Only after checking that `.env` contains the **local** database URL:

```bash
pnpm db:migrate
pnpm dev
```

The app listens on port 3000 by default. To use another port, set `PORT=3001` in `.env`. Open `http://localhost:3000` and `/admin`. Without OAuth values, the admin sign-in button cannot authenticate; without a local admin user/role, the dashboard remains restricted. Roles are enforced on the server and are not self-selectable in the browser.

Useful checks:

```bash
pnpm check
pnpm test
pnpm build
```

Use `pnpm db:migrate` to apply the committed migrations. Avoid `pnpm db:push` for routine setup because it generates a new migration as well as applying it.

## 4. Protect the secrets

- `.env` is excluded by `.gitignore`; `.env.example` is safe to commit because it contains placeholders only.
- Never commit a populated `.env`, production database URL, OAuth signing secret, API key, database dump, or real user data.
- Never point `DATABASE_URL` to the managed production database from a local checkout unless the project owner has explicitly authorized a separate operational procedure.
