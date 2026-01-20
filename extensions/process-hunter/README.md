# Process Hunter

Kill orphaned dev server processes that hog your memory and drain your battery.

## The Problem

Dev servers get lost. You close a terminal, an AI agent spawns background processes, or something crashes — and now you have zombie Node, Python, or Go processes eating RAM and CPU.

Process Hunter finds these orphaned processes and lets you kill them with a keystroke.

## Features

- **Find Lost Processes** — Scans for dev servers listening on ports (Node, Python, Go, Ruby, Rust, Java, etc.)
- **Group by Terminal** — See which processes belong to VS Code, Warp, iTerm, or are truly orphaned
- **Kill with Confidence** — Graceful termination (SIGTERM) with fallback to force kill (SIGKILL)
- **Batch Operations** — Select multiple processes and kill them all at once
- **Auto-Refresh** — Keeps the list updated so you can watch processes come and go

## Perfect For

- **AI Agent Users** — Claude, Cursor, Copilot, and other AI tools spawn dev servers that outlive their sessions
- **Terminal Hoppers** — Switching between terminals and losing track of what's running where
- **Battery Savers** — Finding that mystery process that's been draining your laptop

## Usage

1. Open Raycast
2. Search "Process Hunter"
3. See all dev server processes grouped by their parent terminal
4. Press Enter to kill, or select multiple with ⌘+S and batch kill with ⌘+⇧+K

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Kill process |
| `⌘ + S` | Toggle selection |
| `⌘ + ⇧ + K` | Kill all selected |
| `⌘ + ⌥ + K` | Kill all in section |
| `⌘ + R` | Refresh list |
| `⌘ + O` | Open in browser |
| `⌘ + ⇧ + C` | Copy port |
| `⌘ + ⇧ + F` | Reveal in Finder |

## Preferences

- **Refresh Interval** — How often to scan for processes (default: 10s)
- **Kill Timeout** — How long to wait before force killing (default: 5s)
- **Show Memory/CPU** — Display resource usage in the list
- **Default Action** — Choose between Kill or Select as the primary action
