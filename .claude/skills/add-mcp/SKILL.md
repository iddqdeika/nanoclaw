---
name: add-mcp
description: Add an MCP server to NanoClaw agent containers. Use when the user wants to give the agent access to external tools via MCP (Jira, Confluence, Notion, databases, etc.).
---

# Adding an MCP Server to NanoClaw

MCP servers run inside agent containers and give Claude access to external tools. This skill walks through the correct way to add one.

## Architecture

Every message triggers a Docker container running `nanoclaw-agent:latest`. The agent-runner inside the container initializes MCP servers at query start via the Claude Agent SDK. Key constraint: **the container has no access to the host `.env` file** — it is shadowed with `/dev/null` for security.

## The Three Parts of Adding an MCP Server

### 1. Register the MCP server in the agent-runner

Edit `container/agent-runner/src/index.ts`. Find the `mcpServers` block inside the `query()` call:

```typescript
mcpServers: {
  nanoclaw: { ... },  // built-in IPC server — don't touch
  yourserver: {
    command: 'your-mcp-binary',
    args: [],
    env: {
      API_KEY: 'hardcoded-or-read-from-file',
    },
  },
},
```

Also add `'mcp__yourserver__*'` to `allowedTools`.

### 2. Allow the MCP tools

In the same file, find `allowedTools` and add:

```typescript
'mcp__yourserver__*',
```

### 3. Get credentials into the container

The container cannot read the host `.env`. Three options, in order of preference:

#### Option A: Pre-install binary + secrets file (recommended)

Put credentials in the group folder — it's mounted as `/workspace/group/` in the container:

```bash
# Write once per group that needs access
cat > groups/telegram_main/mcp-secrets.json << 'EOF'
{
  "API_KEY": "...",
  "API_URL": "..."
}
EOF
```

Read in agent-runner:

```typescript
env: (() => {
  try {
    return JSON.parse(fs.readFileSync('/workspace/group/mcp-secrets.json', 'utf-8'));
  } catch {
    return {};
  }
})(),
```

#### Option B: Hardcode (personal installs only)

Fine for self-hosted personal assistants. Just put the values directly in the `env` block.

#### Option C: Inject via container args

**Do not use.** Passing `-e KEY=VALUE` to docker on Windows with Git Bash causes MSYS path mangling. The env vars never reach the container. This was extensively debugged and ruled out.

---

## Pre-installing the MCP Binary (Required for uvx-based servers)

`uvx some-mcp-server` downloads on first run. In a container, this happens during MCP init, often timing out before the server is ready. The fix: pre-install in the Docker image.

Edit `container/Dockerfile` — add to the `apt-get` RUN block:

```dockerfile
# One RUN per MCP — each becomes its own cache layer.
# Adding a new server only downloads that one; existing layers stay cached.
RUN UV_TOOL_BIN_DIR=/usr/local/bin uv tool install your-mcp-package
```

And add the ENV for the tool dir (before the apt block):

```dockerfile
ENV UV_TOOL_DIR=/opt/uv-tools
ENV PATH="/opt/uv-tools/bin:$PATH"
```

Then in the agent-runner, use the binary directly instead of `uvx`:

```typescript
// Before (slow - downloads on every cold start):
command: 'uvx',
args: ['mcp-atlassian'],

// After (instant - pre-installed in image):
command: 'mcp-atlassian',
args: [],
```

Rebuild the image:

```bash
./container/build.sh
```

---

## Stale Session Problem

When you add a new MCP server, existing resumed sessions **don't see the new tools**. Claude answers from memory of the old session where the tools didn't exist.

**Fix:** Clear the session files for the affected group before testing:

```bash
rm -f data/sessions/telegram_main/.claude/sessions/*.json
```

Also stop any running agent container so a fresh one starts:

```bash
docker ps --filter name=nanoclaw- --format '{{.Names}}' | xargs -r docker stop
```

---

## Agent-runner Cache

The agent-runner source is copied to `data/sessions/{group}/agent-runner-src/` and only refreshed when the source `index.ts` is newer than the cached copy. After editing, force a refresh:

```bash
touch container/agent-runner/src/index.ts
rm -rf data/sessions/telegram_main/agent-runner-src
rm -rf data/sessions/slack_main/agent-runner-src
```

---

## Full Checklist

- [ ] MCP server added to `mcpServers` in `container/agent-runner/src/index.ts`
- [ ] Tool pattern added to `allowedTools` (`mcp__servername__*`)
- [ ] Credentials written to `groups/{group}/mcp-secrets.json` (one per group)
- [ ] Binary pre-installed in `container/Dockerfile` (if uvx-based)
- [ ] Docker image rebuilt: `./container/build.sh`
- [ ] Agent-runner cache cleared: `touch container/agent-runner/src/index.ts && rm -rf data/sessions/*/agent-runner-src`
- [ ] Stale sessions cleared: `rm -f data/sessions/{group}/.claude/sessions/*.json`
- [ ] Running containers stopped: `docker ps --filter name=nanoclaw- --format '{{.Names}}' | xargs -r docker stop`
- [ ] PM2 restarted: `pm2 restart nanoclaw`

---

## Example: Atlassian (Jira + Confluence)

**Package:** `mcp-atlassian`

**Dockerfile addition:**
```dockerfile
RUN UV_TOOL_BIN_DIR=/usr/local/bin uv tool install mcp-atlassian
```

**agent-runner mcpServers:**
```typescript
atlassian: {
  command: 'mcp-atlassian',
  args: [],
  env: (() => {
    try {
      return JSON.parse(fs.readFileSync('/workspace/group/mcp-secrets.json', 'utf-8'));
    } catch {
      return {};
    }
  })(),
},
```

**allowedTools:**
```typescript
'mcp__atlassian__*',
```

**groups/telegram_main/mcp-secrets.json:**
```json
{
  "JIRA_URL": "https://yourcompany.atlassian.net",
  "JIRA_USERNAME": "you@example.com",
  "JIRA_API_TOKEN": "ATATT...",
  "CONFLUENCE_URL": "https://yourcompany.atlassian.net/wiki",
  "CONFLUENCE_USERNAME": "you@example.com",
  "CONFLUENCE_API_TOKEN": "ATATT..."
}
```

---

## Debugging

**MCP server not appearing as tools:**
```bash
# Check binary exists in image
docker run --rm --entrypoint which nanoclaw-agent:latest mcp-atlassian

# Check secrets file is readable in container
MSYS_NO_PATHCONV=1 docker exec <container> cat /workspace/group/mcp-secrets.json

# Check compiled agent-runner has the server
MSYS_NO_PATHCONV=1 docker exec <container> grep -A5 "yourserver" /tmp/dist/index.js

# Test MCP server starts with creds
MSYS_NO_PATHCONV=1 docker exec <container> bash -c 'export $(cat /workspace/group/mcp-secrets.json | python3 -c "import sys,json; [print(k+\"=\"+v) for k,v in json.load(sys.stdin).items()]") && timeout 5 mcp-atlassian 2>&1'
```

**Windows/Git Bash path mangling:**
Always prefix `docker exec` commands with `MSYS_NO_PATHCONV=1` when paths like `/app/src` are involved, or Git Bash will rewrite them to `C:/Program Files/Git/app/src`.
