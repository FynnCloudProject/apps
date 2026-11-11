# FynnCloud Talk (`app-talk`)

First-party team messaging, file collaboration, and WebRTC audio/video conferencing application for **FynnCloud**.

## Features

- **1:1 Direct Messages & Group Channels**: Start private conversations or create topic-driven channels with FynnCloud users and groups.
- **Rich Real-Time Messaging**: Threaded replies, emoji reactions, message editing and deletion, unread counters, typing indicators, and custom user presence (`online`, `away`, `dnd`, `offline`).
- **Built-in WebRTC Audio/Video Calls & Screen Sharing**: Zero-dependency peer-to-peer WebRTC mesh audio/video calls with camera toggle, microphone mute, screen sharing (`getDisplayMedia`), raise hand, and speaking indicators.
- **Deep FynnCloud Files Integration**:
  - Share files directly from FynnCloud Files via the **"Share in Talk"** context menu action.
  - Attach cloud files from your FynnCloud drive or upload local files directly into a conversation.
  - Preview and download shared attachments or save them into your own FynnCloud Files.
- **Isolated Persistence**: Uses FynnCloud's provisioned PostgreSQL schema (`app_talk`) via Swift Fluent, with automatic SQLite fallback for standalone development and testing.

## Local Development

```bash
swift build
PORT=3090 swift run Talk
```

Or launch alongside the full FynnCloud stack from `FynnCloud-Backend`:

```bash
./dev.sh --with-ui
```

