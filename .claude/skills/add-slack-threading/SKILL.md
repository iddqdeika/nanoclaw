---
name: add-slack-threading
description: Add Slack threading support — bot replies in threads and uses thread-scoped context. Requires Slack channel to be set up first (use /add-slack). Triggers on "slack threading", "slack threads", "reply in thread", "thread support".
---

# Add Slack Threading Support

Adds two capabilities:
1. **Reply in thread** — bot always replies in a thread (creates one for top-level messages, replies in existing threads)
2. **Thread-aware context** — when triggered from a thread, agent only sees messages from that thread

## Prerequisites

Slack channel must already be set up. Check that `src/channels/slack.ts` exists. If not, run `/add-slack` first.

## Changes

### 1. Always reply in thread — `src/channels/slack.ts`

Currently, top-level messages have no `thread_id` because `thread_ts === ts` is treated as "no thread" (line ~128):

```typescript
const threadId =
  msg.thread_ts && msg.thread_ts !== msg.ts ? msg.thread_ts : undefined;
```

**Change:** For top-level messages (no existing thread), set `thread_id` to the message's own `ts` so the bot's reply creates a new thread under that message:

```typescript
// For thread replies, use the parent thread_ts.
// For top-level messages, use the message's own ts so the bot reply creates a thread.
const threadId = msg.thread_ts || msg.ts;
```

Also update the comment block above (lines 86-88) to reflect the new behavior:

```typescript
// Thread-aware: replies go back into the originating thread.
// Top-level messages get a new thread (bot replies under the message).
```

### 2. Thread-aware context — `src/index.ts`

Currently, `formatMessages(missedMessages, TIMEZONE)` sends ALL recent channel messages to the agent, regardless of thread. When `triggerThreadId` is set, filter to only thread messages.

Find the line (around line 246):

```typescript
const prompt = formatMessages(missedMessages, TIMEZONE);
```

**Replace with:**

```typescript
// When triggered from a thread, scope context to that thread only.
// Include messages that are in the same thread (thread_id matches)
// or ARE the thread parent (message id matches the thread ts).
const contextMessages = triggerThreadId
  ? missedMessages.filter(
      (m) => m.thread_id === triggerThreadId || m.id === triggerThreadId,
    )
  : missedMessages;
const prompt = formatMessages(
  contextMessages.length > 0 ? contextMessages : missedMessages,
  TIMEZONE,
);
```

The fallback to `missedMessages` handles edge cases where the thread parent is outside the message window.

### 3. Update known limitations — `.claude/skills/add-slack/SKILL.md`

Find the "Known Limitations" section. Remove or update the "Threads are flattened" bullet to say threading is now supported. Replace with:

```markdown
- **Thread context window** — Thread-scoped context only includes messages within the current retrieval window (`MAX_MESSAGES_PER_PROMPT`). Very long threads may lose early context.
```

## Build and restart

```bash
npm run build
```

Then restart NanoClaw using whatever service manager is configured (PM2, launchd, systemd, or direct `node dist/index.js`).

## Verify

1. In a Slack channel, send a message mentioning the bot (e.g., `@Andy hello`)
2. The bot should reply **in a thread** under that message
3. Reply in that thread with another question — the bot should reply in the same thread
4. The bot's context should only include messages from that thread, not the whole channel

## Rollback

To revert, restore the original `thread_id` logic in `slack.ts` and remove the context filter in `index.ts`:

```bash
git checkout src/channels/slack.ts src/index.ts
npm run build
```
