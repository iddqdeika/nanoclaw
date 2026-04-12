---
name: manage-rules
description: Add, update, or remove scoped rules and skills via IPC. Main group only.
---

# /manage-rules — Manage Rules and Skills

Add, update, or remove rules (prompt instructions) and skills (slash commands) across three scopes.

## Scopes

| Scope | Applies to |
|-------|------------|
| `core` | All groups |
| `admin` | Main group only |
| `untrusted` | Non-main groups only |

## Rules

Rules are injected into every agent prompt for groups in that scope. Takes effect on next message.

```
mcp__nanoclaw__add_rule(scope, name, content)   # add or overwrite
mcp__nanoclaw__remove_rule(scope, name)          # delete
```

## Skills

Skills are slash commands synced to `.claude/skills/`. Takes effect on next container start.

```
mcp__nanoclaw__add_skill(scope, name, files)    # files = { "SKILL.md": "..." }
mcp__nanoclaw__remove_skill(scope, name)         # delete
```

## Inspect current rules/skills

```bash
ls /workspace/project/rules/core/ /workspace/project/rules/admin/ /workspace/project/rules/untrusted/ 2>/dev/null
ls /workspace/project/container/skills/ /workspace/project/container/skills-admin/ /workspace/project/container/skills-untrusted/ 2>/dev/null
```

## Name rules

Names must match `[a-zA-Z0-9][a-zA-Z0-9._-]*` — no spaces, no slashes.
