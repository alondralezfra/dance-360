# 0035. Hosting on Cloudflare Workers Static Assets, deployed from GitHub Actions

- Status: Accepted
- Date: 2026-11-23
- Part of Stage 1 in [operations-and-quality.md](../operations-and-quality.md). Builds on the CI in [0006](0006-verification-workflow.md).

## Context
The app is a static build (`dist/`) with no server. The owner bought `formism.app` and has it in a Cloudflare account. Stage 1 asks for hosting with SSL, preview URLs, security headers, production deploys only from `main` after CI is green, and a rollback plan.

## Decisions (made with the project owner)
- **Cloudflare Workers Static Assets**, not Pages: it is Cloudflare's current path for static sites, gives a preview URL per uploaded version and instant rollback, and can grow a Worker later (Supabase work in 0015 may want one). `wrangler.jsonc` serves `dist/`, with `not_found_handling: single-page-application` so reloading a deep address works.
- **Deploys run from GitHub Actions** (`.github/workflows/deploy.yml`), not Cloudflare's Git integration, because that would build in parallel with CI and could ship a red commit. Production runs on `workflow_run` of **CI** finishing green on `main`; a pull request from this repository uploads a preview version (`wrangler versions upload`) and never touches production. The Cloudflare tool is run through `cloudflare/wrangler-action`, so there is no extra npm dependency.
- **Credentials are two GitHub repository secrets**, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Nothing about the account is in the repository.
- **Production address: `formism.app`** (custom domain in `wrangler.jsonc`); the free `*.workers.dev` address stays on.
- **Security headers in `public/_headers`**: a Content-Security-Policy (own files only; `blob:` for the song player and images; inline styles allowed because React sets some style attributes; no inline or external scripts), nosniff, referrer policy, a locked-down permissions policy, HSTS, and long caching for hashed files under `/assets/`.

## Consequences
- Rolling back = in the Cloudflare dashboard, Workers & Pages -> formism -> Deployments, roll back to the previous version (or re-run the deploy workflow on an older commit).
- The CSP will need widening when a feature adds an outside host (Supabase in `connect-src`, a video embed in `frame-src`): do it in that change.
- The deploy workflow runs a smoke test of the live site after each production deploy (decision 0036); the header policy is also checked by `src/repoConfig.test.ts`.
- Preview versions need the Worker to exist, so they work after the first production deploy.
- The Wrangler version is pinned (`wranglerVersion` in both jobs of `deploy.yml`) because the action's default is 3.90, which cannot read `wrangler.jsonc`. Dependabot does not update it: bump it by hand now and then, after a `npx wrangler@<new> deploy --dry-run`.
