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
  scope: "admin" | "core" | "untrusted"
)
```

The one-shot can read/write your group folder via `/workspace/parent/`. Use this for step-by-step collaboration:
1. Write instructions or data to your group folder
2. Spawn the one-shot with a prompt referencing `/workspace/parent/`
3. The one-shot writes results back to `/workspace/parent/`
4. Read the results from your own `/workspace/group/`

## Do NOT use one-shot for

- Simple questions or lookups — just answer them
- Tasks that need your conversation history — one-shots start fresh
- Quick file operations — use a subagent or do it yourself
- Anything under 2 minutes — the container startup overhead isn't worth it
