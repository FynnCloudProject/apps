# FynnCloud App Store Registry

The official catalog and registry for [FynnCloud](https://fynncloud.com) applications.

This repository serves as the central directory for third-party and community applications installable on FynnCloud. When changes are merged into `main`, GitHub Actions automatically compiles and publishes the catalog to [GitHub Pages](https://apps.fynncloud.com/index.json).

---

## 📁 Repository Structure

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

## 🚀 Adding a New App

1. **Copy the template**:
   ```bash
   cp -r template apps/my-app
   ```

2. **Configure your manifest** in `apps/my-app/manifest.json`:
   - `id`: Must be unique, kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`, 2–32 chars).
   - `category`: Choose from `productivity`, `collaboration`, `office`, `media`, `ai`, `utilities`, `security`, `system`, `developer`.
   - `image`: Provide your public Docker container image (e.g. `ghcr.io/your-user/your-app:1.0.0`).

3. **Add assets**:
   - Provide an `icon.svg` (clean vector icon).
   - Provide a `README.md` detailing features, requested scopes, and configuration.
   - Optional: Add screenshots in `screenshots/`.

4. **Test locally**:
   ```bash
   npm test
   ```

5. **Submit a Pull Request**:
   Once merged, your app will automatically be available in FynnCloud instances worldwide!

---

## 🔒 Security & Guidelines

- **Container Images**: Must run unprivileged (`non-root`) and expose port `8080` by default.
- **Permissions**: Only request the minimal scopes needed for your app.
- **Versioning**: Follow Semantic Versioning (`SemVer`). Pinned image tags are required (no `:latest` in production).
