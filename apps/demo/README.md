# FynnCloud Demo App

The official reference application demonstrating all [FynnCloud](https://fynncloud.com) platform capabilities, App Bridge RPC integration, database isolation, real-time webhooks, persistent volumes, and UI hooks.

---

## 🌟 Key Features

1. **FynnCloud App Bridge SDK**:
   - Automatic handshake (`fynncloud:ready` ➔ `fynncloud:init`) receiving user identity, theme, locale, and active JWT token.
   - Host notifications (`fynncloud:showToast`).
   - Host shell navigation (`fynncloud:navigate`).
   - Sandboxed Key-Value storage (`fynncloud:storage:set`, `get`, `delete`).
   - Diagnostic platform ping (`fynncloud:ping`).
   - Reactive theme syncing with instant dark/light mode switches.

2. **Core API Integration**:
   - Directly queries `/api/files` with short-lived scoped `AppAccessToken`.
   - Accesses user profile and file metadata without leaking main user credentials.

3. **Database Schema Isolation**:
   - Seamlessly uses FynnCloud's auto-provisioned PostgreSQL schema and dedicated role.

4. **Persistent Storage Volume**:
   - Verifies disk persistence at `/data`.

5. **Real-Time Webhooks Receiver**:
   - Listens on `/api/events/webhook` for subscribed events (`file.created`, `file.updated`, `user.created`, etc.).
   - Validates HMAC SHA-256 signatures via `X-FynnCloud-Signature`.

6. **UI & Integration Hooks**:
   - Host sidebar navigation (`ui.sidebar`) for top and bottom native sidebar links.
   - File action hook (`hooks.file_actions`) enabling right-click context menu "Inspect with Demo".

---

## 🚀 Running Locally

```bash
cd app-demo
npm install
npm run dev
```

The app will be available at `http://localhost:8080`.

---

## 🐳 Docker

```bash
# Build Docker image
docker build -t ghcr.io/fynncloudproject/app-demo:1.0.0 .

# Run container
docker run -p 8080:8080 \
  -e FYNNCLOUD_API_URL="http://host.docker.internal:8080" \
  ghcr.io/fynncloudproject/app-demo:1.0.0
```

---

## 🔒 Security

- Runs unprivileged as non-root user (`node`).
- Scoped token capabilities enforced by FynnCloud's `AppAuthorizationPolicy`.
- Validates HMAC signatures for inbound webhooks.
