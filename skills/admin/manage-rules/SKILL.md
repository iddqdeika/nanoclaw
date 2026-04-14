---
name: manage-rules
description: Add, update, or remove scoped rules and skills via IPC. Main group only.
---

# /manage-rules — Manage Rules and Skills

Add, update, or remove rules (prompt instructions) and skills (slash commands) across four tiers.

## Tiers

| Tier | Loaded for |
|------|------------|
| `core` | All trust levels |
| `trusted` | main + trusted |
| `admin` | main only (e.g. rule management, one-shot use) |
| `untrusted` | untrusted only (security-hardened) |

## Rules

Rules are injected into every agent prompt for the applicable tier. Takes effect on next message.

```
mcp__nanoclaw__add_rule(scope, name, content)   # add or overwrite
mcp__nanoclaw__remove_rule(scope, name)          # delete
```

`scope` is one of `core | trusted | admin | untrusted`.

## Skills

Skills are slash commands synced into the container's `.claude/skills/` at container launch. Takes effect on next container start.

```
mcp__nanoclaw__add_skill(scope, name, files)    # files = { "SKILL.md": "..." }
mcp__nanoclaw__remove_skill(scope, name)         # delete
```

## Inspect current rules/skills

```bash
for tier in core trusted admin untrusted; do
  echo "=== rules/$tier ==="; ls /workspace/project/rules/$tier/ 2>/dev/null
  echo "=== skills/$tier ==="; ls /workspace/project/skills/$tier/ 2>/dev/null
done
```

## Name rules

Names must match `[a-zA-Z0-9][a-zA-Z0-9._-]*` — no spaces, no slashes.
