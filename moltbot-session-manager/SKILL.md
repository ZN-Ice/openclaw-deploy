---
name: moltbot-session-manager
description: |
  Clear all Moltbot sessions using the moltbot CLI gateway commands.
  Use when user asks to "clear all sessions", "delete sessions", "reset moltbot",
  or mentions "moltbot sessions" in the context of cleanup/reset operations.
version: 1.0.0
license: MIT
tags:
  - moltbot
  - session-management
  - cli-automation
allowed-tools: Bash Read Write
---

# Moltbot Session Manager

## Overview
Clears all active Moltbot sessions by listing and deleting them via the `moltbot gateway call` CLI commands.

## When to Use
- User requests to clear/delete all Moltbot sessions
- User wants to reset Moltbot session state
- Session cleanup is needed before testing
- "Clear all sessions" or "delete sessions" command is given

## Prerequisites
- `moltbot` CLI must be installed and available in PATH
- User must have permissions to call `sessions.list` and `sessions.delete` gateway methods

## Implementation

The JavaScript implementation (`src/index.js`):
1. Calls `moltbot gateway call sessions.list --json` to get all sessions
2. Parses JSON response to extract session keys
3. Iterates through each session key
4. Calls `moltbot gateway call sessions.delete --params '{"key":"<session-key>"}'` for each
5. Reports progress and completion

## Usage

### Direct Execution
```bash
node src/index.js
```

### As Global CLI (after npm link)
```bash
npm link
clear-moltbot-sessions
```

### Via npm script
```bash
npm start
```

## Error Handling
- JSON parse errors: Displays raw output and exits with code 1
- Command execution errors: Displays error message and command that failed
- Empty session list: Gracefully exits with "No sessions found" message

## Output Format
```
Fetching all session keys...
Found 3 session(s). Deleting...

Deleting session: abc123def456
✓ Deleted: abc123def456

Deleting session: xyz789uvw012
✓ Deleted: xyz789uvw012

All sessions deleted successfully!
```

## Security Considerations
- This tool irreversibly deletes all sessions
- No confirmation prompt - use with caution
- Consider adding a `--dry-run` flag for production environments
