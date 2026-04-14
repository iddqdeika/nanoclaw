# Global Memory

You have write access to `/workspace/global/` — a shared memory visible to all groups (read-only for them).

Use this to store information that should be available across all groups: summaries, research findings, events, decisions, status updates.

## Writing to global memory

Write markdown files to `/workspace/global/memory/`:

```bash
mkdir -p /workspace/global/memory
```

### File naming

- Daily summaries: `YYYY-MM-DD-summary.md`
- Topic files: `topic-name.md` (e.g. `project-status.md`, `contacts.md`)
- Event logs: `YYYY-MM-DD-events.md`

### Structure

Each file should have a clear title and date:

```markdown
# Daily Summary — 2026-04-08

## Events
- ...

## Decisions
- ...

## Action Items
- ...
```

## When to write global memory

- User asks to summarize, research, or log something for future reference
- User says "remember this", "save this", "add to memory"
- Daily/weekly summaries requested
- Cross-group information that other groups should see

## Index

Maintain `/workspace/global/memory/INDEX.md` as a list of all memory files with one-line descriptions. All groups read this to find available memory. Update it whenever you add or remove a file.

## Researching "what happened"

To answer questions like "what happened yesterday" or "list recent events":

1. Query `messages.db` for recent messages across all groups:

```python
import sqlite3, json
conn = sqlite3.connect('/workspace/project/store/messages.db')
rows = conn.execute("""
    SELECT m.chat_jid, c.name, m.sender_name, m.content, m.timestamp
    FROM messages m
    JOIN chats c ON m.chat_jid = c.jid
    WHERE m.timestamp > datetime('now', '-1 day')
      AND m.is_bot_message = 0
    ORDER BY m.timestamp DESC
    LIMIT 100
""").fetchall()
for r in rows: print(r)
conn.close()
```

2. Summarize the findings
3. Save the summary to `/workspace/global/memory/`
4. Report back to the user

