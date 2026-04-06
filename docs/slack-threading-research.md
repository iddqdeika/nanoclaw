# Slack Threaded Responses — Research

## How Slack Threading Works

When a user posts in a Slack thread, the API message includes both `ts` (message timestamp) and `thread_ts` (the parent message timestamp). To reply in that thread, `chat.postMessage` must include `thread_ts`. Without it, the reply goes to the channel root.

---

## Current State

### What already exists

- `NewMessage.thread_id?: string` is defined in `src/types.ts` — planned but never populated
- Telegram already has full thread support: captures `message_thread_id`, stores it, passes it to `sendMessage(jid, text, threadId?)`, and uses it in `chat.postMessage`. The pattern is proven.
- `reply_to_message_id` / `reply_to_message_content` work end-to-end via the same pipeline — thread support would follow the same path

### What is broken/missing

**`src/channels/slack.ts`**
- Receives `thread_ts` from Slack but discards it (explicitly commented as intentional)
- `sendMessage(jid, text)` matches the base `Channel` interface — no thread parameter

**`src/db.ts`**
- No `thread_id` column in the messages table — `thread_id` from `NewMessage` is silently dropped on insert

**`src/router.ts`**
- `formatMessages()` ignores `thread_id` — the agent never sees thread structure in its prompt

**`container/agent-runner/src/ipc-mcp-stdio.ts`**
- `send_message` MCP tool has no thread parameter
- The IPC file written to disk has no thread field

**`src/ipc.ts`**
- `sendMessage` callback type is `(jid: string, text: string) => Promise<void>` — no thread arg

**`src/index.ts`**
- All send paths call `channel.sendMessage(jid, text)` — thread context never passed

---

## Two Implementation Strategies

### Strategy A — Auto-thread (simpler, recommended)

The agent always replies in the thread of the message that triggered it. The agent never needs to know about threads or make decisions.

Thread_ts flows: `Slack inbound → NewMessage.thread_id → DB → ContainerInput → default send path`

Changes needed:
1. **`src/channels/slack.ts`** — capture `thread_ts` into `thread_id` on inbound; accept optional `threadTs` in `sendMessage` and pass to `chat.postMessage`
2. **`src/db.ts`** — add `thread_id` column; store and retrieve it
3. **`src/types.ts`** — update `Channel.sendMessage` to accept optional options: `sendMessage(jid, text, options?: { threadTs?: string })`
4. **`src/index.ts`** — extract `thread_id` from the triggering message and pass it through the send path
5. **`src/ipc.ts`** — extend `sendMessage` callback type and the IPC file reader to pass thread context
6. **Other channel implementations** (Telegram, Discord, etc.) — update to accept the new optional parameter (no behavior change needed, just interface conformance)

The agent prompt doesn't need to change. The agent sends normally; the system handles threading transparently.

### Strategy B — Agent-controlled threading (more flexible)

The agent sees thread context in its prompt and can choose to reply in a thread or not, using `send_message` with an optional `thread_ts` argument.

All changes from Strategy A, plus:
- **`src/router.ts`** — add `thread_id` attribute to XML message format
- **`container/agent-runner/src/ipc-mcp-stdio.ts`** — add `thread_ts` param to `send_message` tool
- **Agent prompt** — document the thread_ts parameter

More powerful but adds agent reasoning burden. Only useful if you want the agent to sometimes reply in-channel and sometimes in-thread based on context.

---

## Recommended Approach

**Strategy A.** For a personal assistant, always replying in the thread where you were addressed is the right behavior — it keeps Slack channels clean without requiring any agent prompting changes.

Strategy B complexity is only justified if you need the agent to make threading decisions (e.g., proactive messages, scheduled task outputs going to channel root).

---

## Migration Risk

The only non-trivial change is the DB schema. The `thread_id` column needs to be added to an existing database. Since NanoClaw already uses `ALTER TABLE ... ADD COLUMN` patterns for migrations (check `src/db.ts`), this is low risk — add the column as nullable with no default.

---

## Files to Change (Strategy A)

| File | Change |
|------|--------|
| `src/channels/slack.ts` | Capture `thread_ts`; pass `thread_ts` to `chat.postMessage` |
| `src/db.ts` | Add `thread_id` column; update store/retrieve |
| `src/types.ts` | Add `options?: { threadTs?: string }` to `Channel.sendMessage` |
| `src/ipc.ts` | Extend `sendMessage` callback type; read `thread_ts` from IPC file |
| `src/index.ts` | Pass thread context from triggering message through send path |
| `src/channels/telegram.ts` | Conform to updated interface (no behavior change) |
| Other channels | Same — interface conformance only |
