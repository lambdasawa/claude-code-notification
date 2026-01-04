# Claude Code Notification

A web application that provides rich desktop and audio notifications for Claude Code by watching `~/.claude/projects/`.

The primary use case is adding notifications to Claude Code running inside a Sandbox VM (where native desktop notifications aren't available), but it works equally well on the host machine.

## Features

- **No hooks required**: Automatically watches session files under `~/.claude/projects/`
- **Desktop notifications**: Browser-based notifications via Web Notification API
- **Audio notifications**: Text-to-speech via Web Speech API
- **Activity log**: Real-time stream of all Claude Code messages
- **Session browser**: Browse projects and conversation history

## Usage

```bash
npm install
npm run dev
```

Open `http://localhost:3010` in your browser, then:
1. Click "Listening" to start watching for events
2. Enable "Desktop Notification" and/or "Speech" as needed
3. Keep the tab open while working with Claude Code

### For Sandbox VM

Run the app inside the VM and access it from the host browser via port forwarding.

```
┌─────────────────────────────────────────────────────────────────┐
│  Sandbox VM                                                     │
│  ┌─────────────┐      ┌──────────────────────────────────────┐  │
│  │ Claude Code │ ──── │ This App (watches ~/.claude)         │  │
│  └─────────────┘      └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │ Port forwarding
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│  Host: Browser → Desktop notifications / Speech                   │
└───────────────────────────────────────────────────────────────────┘
```

## Environment Variables

- `PORT` - Server port (default: 3010)

## Requirements

- Node.js 24+
