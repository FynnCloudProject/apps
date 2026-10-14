# WebDAV

Mount your FynnCloud storage as a network drive in macOS Finder, Windows Explorer, Cyberduck, rclone, and other WebDAV clients.

## How to Connect

WebDAV connections use an **App-Specific Password** instead of your regular account password so your main credentials stay protected and individual devices can be revoked at any time.

1. Open **Settings → Security → App-Specific Passwords** in FynnCloud and click **Generate App Password**.
2. Copy the generated password (it starts with `fc_app_...` and is only shown once).
3. In your WebDAV client, connect with:
   - **Server URL**: `https://<your-fynncloud-domain>/api/apps/webdav/proxy`
   - **Username**: Your FynnCloud username
   - **Password**: Your `fc_app_...` app-specific password

## Client Guides

- **macOS Finder**: Press `⌘K` (**Go → Connect to Server…**), enter the Server URL, choose **Registered User**, and sign in with your username and `fc_app_...` password.
- **Windows Explorer**: Right-click **This PC → Map network drive…**, paste the Server URL, check **Connect using different credentials**, and enter your username and `fc_app_...` password.
- **Cyberduck / Mountain Duck**: Choose **WebDAV (HTTPS)**, set the path to `/api/apps/webdav/proxy`, and enter your username and `fc_app_...` password.
