# Agro Hub — owner guide

This clean source snapshot was exported from `main` at commit `e2e6b83`. It contains the committed application source and assets, but no `.git` history, ignored files, `node_modules`, build output, `.env` files or runtime credentials. The existing live project remains Manus-managed; this export is a separate copy and does not connect or publish anything.

## Local development

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) and [.env.example](.env.example) for safe local MySQL setup, OAuth requirements, migrations, and secret handling. Never use the production database URL in a local checkout.

## Import this folder into your own GitHub repository

1. Create an empty GitHub repository. For an unreleased project, consider making it private. Do not pre-create a README, license or `.gitignore`.
2. In a terminal opened in this extracted folder, run:

   ```bash
   git init
   git add -A
   git commit -m "Import Agro Hub"
   git branch -M main
   git remote add origin https://github.com/<YOUR-ACCOUNT>/<YOUR-REPOSITORY>.git
   git push -u origin main
   ```

   Replace the placeholders with your repository details and complete GitHub's own sign-in prompt. This creates a new Git history. It does not connect the Manus project to GitHub or preserve Manus repository history. Keep database/OAuth/runtime secrets out of GitHub.

## Publish on a permanent domain

Current project configuration already declares the Express container deployment (`Dockerfile`, health path `/api/health`) and managed server/database. The current public address is a Preview URL; no custom production domain is configured, and automatic publishing is off. A GitHub push or source export alone will not publish the site.

For a Manus-hosted production launch:

1. In the Manus website/project builder, open the production **Publish** and custom-domain flow. Choose the exact domain or subdomain you own; a real domain has not yet been supplied for this project.
2. Use only the DNS records Manus supplies for that domain. At your registrar/DNS host, add the specified A/CNAME/TXT records exactly. Do not guess targets. Avoid removing existing records unless the setup flow instructs you; preserve mail-related MX/TXT records.
3. Wait for domain verification and HTTPS certificate provisioning. Manus documentation says SSL/TLS is provisioned automatically after a domain is connected.
4. Configure `PUBLIC_SITE_URL` as the exact canonical HTTPS origin (for example `https://www.example.com`) before validating production SEO. Agro Hub uses this value for canonical/social URLs and sitemap generation; optionally set `PUBLIC_OG_IMAGE_URL` too.
5. Publish explicitly from the Dashboard when ready. Automatic publish is currently disabled. Afterwards check `/api/health`, the public homepage, `/sitemap.xml`, `/robots.txt`, the `/admin` no-store behavior and a missing produce URL.

Official guidance: [Manus publishing](https://manus.im/docs/website-builder/publishing), [custom domains](https://manus.im/docs/website-builder/custom-domains), and the [custom-domain Help Center article](https://help.manus.im/en/articles/11711203-how-can-i-connect-the-website-created-by-manus-to-my-custom-domain). The Help Center article says built-in custom-domain support depends on account eligibility; check Help Center for account-specific access. For self-hosting from GitHub, use a full-stack host: this app needs a Node server, MySQL and Manus OAuth configuration, so GitHub Pages alone is not sufficient.

## Admin sign-in and tools

Open `/admin` on the site's current Preview or eventual production domain, then select **Sign in with Manus**. There is no separate Agro Hub password. The admin role is server-side and is not self-selectable.

The admin dashboard includes:

- Overview counts for members, live listings, listings awaiting review, open reports and deletion requests.
- Listing review: approve a pending listing or request changes.
- Seller identity-review queue: mark reviewed or request changes; this is a review status, not a product guarantee.
- Marketplace reports: resolve or dismiss open reports.
- Account deletion requests: acknowledge review only. This action does not erase accounts or order history.
- Payment records are records-only; the dashboard cannot mark a transaction as paid.

Do not add local passwords or place sign-in codes, database credentials or OAuth secrets in this repository.
