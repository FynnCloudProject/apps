# Demo App

Reference application for testing FynnCloud App Bridge RPC, database isolation, webhooks, persistent volumes, and UI hooks.

## Capabilities

- **App Bridge**: Handshake (`fynncloud:ready` / `fynncloud:init`), toast notifications, host navigation, key-value storage, and theme synchronization.
- **REST API**: Queries `/api/files` using scoped `AppAccessToken` bearer tokens.
- **Database**: Uses the auto-provisioned PostgreSQL schema and role.
- **Storage**: Reads and writes to `/data`.
- **Webhooks**: Receives events on `/api/events/webhook` and verifies `X-FynnCloud-Signature` HMAC SHA-256 signatures.
- **UI hooks**: Registers sidebar entries (`ui.sidebar`) and file context menu actions (`hooks.file_actions`).

## Local development

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t ghcr.io/fynncloudproject/app-demo:1.0.0 .
docker run -p 8080:8080 \
  -e FYNNCLOUD_API_URL="http://host.docker.internal:8080" \
  ghcr.io/fynncloudproject/app-demo:1.0.0
```
