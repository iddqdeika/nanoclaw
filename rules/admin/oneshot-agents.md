# One-Shot Agents

You can spawn independent agent containers via `mcp__nanoclaw__spawn_agent`. Use them only when the built-in subagent (agent teams) is not sufficient.

## Default: use subagents

For most tasks, use Claude Code's built-in subagents (`Task`, `TeamCreate`). They run inside your container, share your session and tools, and complete faster. This is the right choice for:
- Sub-questions during a conversation
- File generation, analysis, code tasks
- Anything that needs your current context
- Short tasks (< 5 min)

## When to use one-shot agents

Use `spawn_agent` only when you need something a subagent cannot provide:

- **Scope separation** — the task needs a different permission level (e.g. `core` or `untrusted` scope for sandboxed execution)
- **Parallel heavy work** — a long-running task (research, large analysis) that shouldn't block your conversation
- **Filesystem isolation** — the task might create many files or run risky commands that shouldn't affect your workspace
- **Independent lifecycle** — the task should keep running even if your session ends

## How to use

```
mcp__nanoclaw__spawn_agent(
  prompt: "...",
  scope: "admin" | "trusted" | "untrusted"
)
```

The one-shot can read/write your group folder via `/workspace/parent/`. Use this for step-by-step collaboration:
1. Write instructions or data to your group folder
2. Spawn the one-shot with a prompt referencing `/workspace/parent/`
3. The one-shot writes results back to `/workspace/parent/`
4. Read the results from your own `/workspace/group/`

## Recognizing one-shot output in chat history

One-shot agents send progress updates and results to the same chat where you spawned them. Their messages are **auto-tagged** with a stable prefix:

```
🤖 [oneshot:{id}] {optional sender role} {message body}
```

When you read chat history (via messages.db or the context you're given), messages starting with `🤖 [oneshot:` are from sub-agents you (or a prior main-agent turn) spawned — **not your own previous replies**. Treat them as inputs, not as your own work.

### Using one-shot output

After spawning, you typically want to consume the result in a follow-up turn:

1. Spawn the one-shot, note the returned `id`
2. Either:
   - Tell the user "Spawned researcher X, I'll continue when it's done" and wait for next message (user triggers you again after seeing the result)
   - OR periodically check `/workspace/group/` / the chat for `🤖 [oneshot:X]` messages (if your trigger fires again)
3. When you see `🤖 [oneshot:X] ...` in recent messages, that's the result — parse, synthesize, respond to the user

If the one-shot wrote detailed output to `/workspace/parent/` (e.g. a report file), read that for full content; the chat message is usually a summary.

## Do NOT use one-shot for

- Simple questions or lookups — just answer them
- Tasks that need your conversation history — one-shots start fresh
- Quick file operations — use a subagent or do it yourself
- Anything under 2 minutes — the container startup overhead isn't worth it
