# gh-proxy EdgeOne Pages

## Overview

This repository now uses a simpler EdgeOne Pages layout:

```text
.
├── functions/
│   └── api/
│       └── health.js     # GET /api/health
├── middleware.js         # Global EdgeOne middleware for proxy routing
├── public/
│   ├── index.html        # Static homepage
│   ├── 404.html          # Static fallback page
│   └── styles.css        # Homepage styles
├── scripts/
│   └── verify-proxy.mjs  # Lightweight route parsing checks
├── src/
│   └── proxy/
│       └── core.js       # Proxy logic migrated from the original Cloudflare worker
├── edgeone.json
├── package.json
├── README.md
└── tsconfig.json
```

## Why this structure

The old mix of `pages/`, `public/`, and `_worker.js` made deployment behavior ambiguous. The new layout separates concerns cleanly:

1. `public/` serves the homepage and static files.
2. `functions/api/health.js` handles the health endpoint.
3. Root-level `middleware.js` intercepts GitHub proxy requests before static fallback.
4. `src/proxy/core.js` keeps the original Cloudflare-style proxy logic in one reusable module.

## Supported proxy targets

- `github.com/*/*/releases/*`
- `github.com/*/*/(blob|raw)/*`
- `github.com/*/*/(info|git-)*`
- `github.com/*/*/archive/*`
- `github.com/*/*/tags*`
- `raw.githubusercontent.com/*`
- `gist.github.com/*`
- `gist.githubusercontent.com/*`

Examples:

```text
/https://github.com/user/repo/releases/download/v1.0.0/file.zip
/https://raw.githubusercontent.com/user/repo/refs/heads/main/README.md
/?q=https://raw.githubusercontent.com/user/repo/refs/heads/main/README.md
```

## Runtime configuration

Set these in the EdgeOne Pages console when needed:

- `GH_PROXY_ASSET_URL`
- `GH_PROXY_PREFIX`
- `GH_PROXY_JSDELIVR`
- `GH_PROXY_WHITELIST`
- `GH_PROXY_MAX_REDIRECT_HOPS`

## Deployment notes

`edgeone.json` keeps the project in static-output mode:

- `installCommand`: `:`
- `buildCommand`: `:`
- `outputDirectory`: `public`
- `nodeVersion`: `22.11.0`

EdgeOne should read `public/` for assets and `functions/` for runtime routes directly from the repository.

## Local checks

```bash
npm run verify
```

```bash
edgeone pages dev
```
