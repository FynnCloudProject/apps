# FynnCloud App Store Registry

The official catalog and registry for [FynnCloud](https://fynncloud.ch) applications.

This repository serves as the central directory for third-party and community applications installable on FynnCloud. When changes are merged into `main`, GitHub Actions automatically compiles and publishes the catalog to [GitHub Pages](https://apps.fynncloud.ch/index.json).

---

## Repository Structure

```text
apps/
├── schemas/
│   └── app-manifest-v1.json      # Official JSON Schema for manifests
├── template/                     # Starter boilerplate for new apps
│   ├── manifest.json
│   ├── README.md
│   └── icon.svg
├── apps/                         # App manifests and assets
│   ├── calendar/
│   ├── zipper/
│   └── platform-tester/
└── scripts/
    └── build-catalog.js          # Compiles dist/index.json
```

---

## Adding a New App

1. **Copy the template**:
   ```bash
   cp -r template apps/my-app
   ```

2. **Configure your manifest** in `apps/my-app/manifest.json`:
   - `id`: Must be unique, kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`, 2–32 chars).
   - `category`: Choose from `productivity`, `collaboration`, `office`, `media`, `ai`, `utilities`, `security`, `system`, `developer`.
   - `image`: Provide your public Docker container image (e.g. `ghcr.io/your-user/your-app:1.0.0`).
   - `compatibility.api_version`: **Required.** The range of FynnCloud *App API* versions your release works with, e.g. `">=0.1.0 <0.2.0"`. See [Compatibility & Releases](#compatibility--releases).

3. **Add assets**:
   - Provide an `icon.svg` (strictly monochrome vector SVG using `fill="currentColor"`; multi-color icons and gradients are disallowed so icons adapt cleanly across light and dark themes).
   - Optional: Provide a 16:9 hero cover image (`hero.webp`, `hero.png`, or `hero.jpg`, minimum 1280x720).
   - Provide a `README.md` detailing features, requested scopes, and configuration.
   - **App Bridge (Frontend UI)**: use the [`@fynncloud/app-bridge`](packages/app-bridge) npm package. With a bundler, `npm install @fynncloud/app-bridge`. Without one, load the pinned browser build: `<script src="https://cdn.jsdelivr.net/npm/@fynncloud/app-bridge@0.1/dist/app-bridge.global.js"></script>`. Docs: [packages/app-bridge/README.md](packages/app-bridge/README.md).
   - Optional: Add gallery images in `gallery/` (`.png`, `.jpg`, `.jpeg` or `.webp`, up to 10, shown sorted by file name; set `gallery` in the manifest to a list of file names to choose the order).
   - Only `manifest.json`, `icon.svg`, `README.md`, the hero image and `gallery/` are published to the catalog. Anything else in the folder (Dockerfile, server code, ...) is not.

4. **Test locally**:
   ```bash
   npm test
   ```

5. **Submit a Pull Request**:
   Once merged, your app will automatically be available in FynnCloud instances worldwide.

---

## Security & Guidelines

- **Container Images**: Must run unprivileged (`non-root`) and expose port `8080` by default.
- **Permissions**: Only request the minimal scopes needed for your app.
- **Versioning**: Follow Semantic Versioning (`SemVer`). Pinned image tags are required (no `:latest` in production).

---

## Compatibility & Versioning

**App API version (`api_version`).** FynnCloud exposes the contract apps rely on (token-gated REST API, scopes, proxy headers, webhooks, App Bridge) as a separately versioned **App API** (see `APP_API.md` in the FynnCloud backend; reported by `GET /api/info` as `apiVersion`). It is **decoupled** from the FynnCloud product version so that server releases (bugfixes, UI updates, refactorings) don't break apps unnecessarily.

```json
"compatibility": { "api_version": ">=0.1.0 <0.2.0" }
```

- Space-separated comparators with an operator (`>=`, `>`, `<=`, `<`, `=`). No `^`, `~` or `||`.
- While the API is `0.x`, any minor release may break apps, so pin one minor. At `1.0.0` use `>=1.0.0 <2.0.0`.
- FynnCloud refuses to install, and stops serving, an app whose range excludes the server's API version.

### Version Compatibility Matrix

| FynnCloud Release | App API Version (`api_version`) | `@fynncloud/app-bridge` | Supported Range | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0 – current** | **0.1.0** | `^0.1.0` | `>=0.1.0 <0.2.0` | Initial App Platform contract (REST allowlist, App Bridge RPC, scoped tokens, webhooks) |

**App Bridge.** The frontend App Bridge is the npm package [`@fynncloud/app-bridge`](packages/app-bridge) (source in this repo under `packages/app-bridge`). Its version tracks the FynnCloud App API version (Bridge `0.1.x` targets API `0.1.x`). An app's `compatibility.api_version` lower bound must be at least the API version of the bridge package it uses.

**Releases.** Maintainers only ever edit `apps/<id>/manifest.json` in place and bump `version`; there is no archive folder to maintain. The catalog build derives earlier releases from git history: every distinct `version` that appeared in the file is a release (the newest commit for that version wins). `dist/index.json` lists them per app as `versions[]`, newest first, each with its own `compatibility`, `image`, `digest` and full `manifest`, so an installer can choose the newest release compatible with the server.

- A published version is immutable: changing `manifest.json` requires a new `version` (checked in pull requests).
- To support a new API version, bump `version` and update `compatibility.api_version`; older releases keep their old range.
- The deploy workflow needs full git history (`fetch-depth: 0`). On a shallow clone the build warns and lists only the current release.
- Older releases are listed with at most 25 entries per app.
