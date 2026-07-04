
# ITXBridge — Free AI Router & Token Saver

  **Save 20-40% tokens. Auto-fallback to free & cheap AI models. Never stop coding.**

  Connect Claude Code, Cursor, Codex, Cline, OpenClaw, Antigravity, Copilot & more to **40+ AI providers & 100+ models** through a single endpoint.

## 🤔 Why ITXBridge?

- ❌ Subscription quotas expire unused every month
- ❌ Rate limits stop you mid-coding
- ❌ Tool outputs (`git diff`, `grep`, `ls`...) burn tokens fast
- ❌ Manual switching between providers wastes time

**ITXBridge fixes this:**

- ✅ **RTK Token Saver** — Auto-compress tool outputs, save 20-40% tokens
- ✅ **Smart 3-tier fallback** — Subscription → Cheap → Free, no downtime
- ✅ **Quota tracking** — Live usage + reset countdowns per provider
- ✅ **Universal** — Works with any OpenAI-compatible CLI tool
- ✅ **100% free & open source** — ITXBridge never charges you

---

## 🔄 How It Works

```
┌─────────────┐
│  Your CLI   │  (Claude Code, Codex, Cursor, Cline, OpenClaw...)
│   Tool      │
└──────┬──────┘
       │ http://localhost:20127/v1
       ↓
┌─────────────────────────────────────────────┐
│           ITXBridge (Smart Router)            │
│  • RTK Token Saver                          │
│  • Format translation (OpenAI ↔ Claude)     │
│  • Quota tracking + auto token refresh      │
└──────┬──────────────────────────────────────┘
       │
       ├─→ [Tier 1: SUBSCRIPTION] Claude Code, Codex, Copilot, Cursor
       │   ↓ quota exhausted
       ├─→ [Tier 2: CHEAP] GLM ($0.6/1M), MiniMax ($0.2/1M)
       │   ↓ budget limit
       └─→ [Tier 3: FREE] Kiro AI, OpenCode Free, Vertex AI ($300 credits)

Result: Never stop coding. Minimal cost + 20-40% token savings via RTK.
```

---

## ⚡ Quick Start

```bash
npm install -g itxbridge
itxbridge
```

Dashboard opens at `http://localhost:20127`. Connect a free provider (Kiro AI or OpenCode Free — no signup needed), then point your CLI tool to `http://localhost:20127/v1`.

**Run from source:**

```bash
cp .env.example .env
npm install
PORT=20127 NEXT_PUBLIC_BASE_URL=http://localhost:20127 npm run dev
```

Default URLs: Dashboard `http://localhost:20127/dashboard` • API `http://localhost:20127/v1`

---

## 🛠️ Supported CLI Tools

Claude Code • OpenClaw • Codex • OpenCode • Cursor • Antigravity • Cline • Continue • Droid • Roo • Copilot • Kilo Code

---

## 🌐 Supported Providers

**🔐 OAuth:** Claude Code • Codex • GitHub Copilot • Cursor • Antigravity

**🆓 Free:** Kiro AI (Claude 4.5 + GLM-5 + MiniMax, unlimited) • OpenCode Free (no auth) • Vertex AI ($300 credits)

**🔑 API Key (40+):** OpenRouter • GLM • Kimi • MiniMax • OpenAI • Anthropic • Gemini • DeepSeek • Groq • xAI • Mistral • Perplexity • Together AI • Fireworks • Cerebras • Cohere • NVIDIA • SiliconFlow • Nebius • Chutes • Hyperbolic • custom OpenAI/Anthropic endpoints

---

## 💡 Key Features

| Feature | Description |
| --------- | ------------- |
| 🚀 **RTK Token Saver** | Compresses `git diff`, `grep`, `ls`, `tree` etc. before sending to LLM — **saves 20-40% input tokens** |
| 🧠 **Headroom** | Optional external compression proxy for context-aware token reduction |
| 🪨 **Caveman Mode** | Injects terse-speak prompt → shorter LLM replies — **saves up to 65% output tokens** |
| 🐴 **Ponytail** | "Lazy senior dev" prompt → minimal YAGNI-first code, fewer tokens |
| 🎯 **Smart 3-Tier Fallback** | Auto-routes: Subscription → Cheap → Free |
| 📊 **Quota Tracking** | Live token counts + reset countdowns per provider |
| 🔄 **Format Translation** | OpenAI ↔ Claude ↔ Gemini ↔ Cursor ↔ Kiro ↔ Vertex |
| 👥 **Multi-Account** | Multiple accounts per provider with round-robin |
| 🔄 **Auto Token Refresh** | OAuth tokens refresh automatically |
| 🎨 **Custom Combos** | Create unlimited model fallback chains |
| 💾 **Cloud Sync** | Sync config across devices |
| 🌐 **Deploy Anywhere** | Localhost, VPS, Docker, Cloudflare Workers |

---

## 💰 Cost Summary

| Tier | Provider | Cost |
| ------ | ---------- | ------ |
| 🚀 Token Saver | RTK (built-in) | **FREE** |
| 💳 Subscription | Claude Code, Codex, Copilot, Cursor | $10-200/mo (paid to them directly) |
| 💰 Cheap | GLM ($0.6/1M), MiniMax ($0.2/1M), Kimi ($9/mo) | Pay-per-use |
| 🆓 Free | Kiro AI, OpenCode Free, Vertex AI ($300 credits) | **$0** |

> 💡 **ITXBridge itself is free and open source.** It never charges you. Dashboard cost displays are estimates for tracking — you only pay providers directly.

---

## 📖 Setup

<details>
<summary><b>🔧 CLI Integration</b></summary>

**Claude Code** — Edit `~/.claude/config.json`:

```json
{ "anthropic_api_base": "http://localhost:20127/v1", "anthropic_api_key": "your-api-key" }
```

**Codex** — `export OPENAI_BASE_URL="http://localhost:20127"`

**Cursor** — Settings → Models → OpenAI API Base URL: `http://localhost:20127/v1`

**Cline / Continue / RooCode** — Provider: OpenAI Compatible → Base URL: `http://localhost:20127/v1`

**OpenClaw** — Dashboard → CLI Tools → OpenClaw → Select Model → Apply (or edit `~/.openclaw/openclaw.json`)

</details>

<details>
<summary><b>🐳 Docker</b></summary>

```bash
docker run -d --name itxbridge -p 20127:20127 \
  -v "$HOME/.itxbridge:/app/data" -e DATA_DIR=/app/data \
  decolua/itxbridge:latest
```

Build from source:

```bash
git clone https://github.com/decolua/itxbridge.git && cd itxbridge
docker build -t itxbridge .
docker run -d --name itxbridge -p 20127:20127 \
  -v "$HOME/.itxbridge:/app/data" -e DATA_DIR=/app/data itxbridge
```

Images: [Docker Hub](https://hub.docker.com/r/decolua/itxbridge) • [GHCR](https://github.com/decolua/itxbridge/pkgs/container/itxbridge) (multi-platform `linux/amd64` + `linux/arm64`)

</details>

<details>
<summary><b>⚙️ Environment Variables</b></summary>

| Variable | Default | Description |
| ---------- | --------- | ------------- |
| `JWT_SECRET` | Auto-generated | JWT signing secret |
| `INITIAL_PASSWORD` | `123456` | First login password |
| `DATA_DIR` | `~/.itxbridge` | App data directory (SQLite) |
| `PORT` | `20127` | Service port |
| `HOSTNAME` | `0.0.0.0` | Bind host (Docker) |
| `NODE_ENV` | — | Set `production` for deploy |
| `CLOUD_URL` | `https://itxbridge.com` | Cloud sync endpoint |
| `ENABLE_REQUEST_LOGS` | `false` | Enable request/response logs |
| `REQUIRE_API_KEY` | `false` | Enforce Bearer token on `/v1/*` |
| `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` | empty | Outbound proxy for upstream calls |

</details>

---

## 📊 Available Models

**Claude Code (`cc/`):** `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5`

**Codex (`cx/`):** `gpt-5.5`, `gpt-5.4`, `gpt-5.3-codex`, `gpt-5.2-codex`

**GitHub Copilot (`gh/`):** `gpt-5.4`, `claude-opus-4.7`, `claude-sonnet-4.6`, `gemini-3.1-pro`

**Cursor (`cu/`):** `claude-4.6-opus-max`, `claude-4.5-sonnet-thinking`, `gpt-5.3-codex`

**Kiro (`kr/`)** — FREE: `claude-sonnet-4.5`, `claude-haiku-4.5`, `glm-5`, `MiniMax-M2.5`, `qwen3-coder-next`, `deepseek-3.2`

**OpenCode Free (`oc/`):** Auto-fetched models, no auth required

**GLM (`glm/`):** `glm-5.1`, `glm-5`, `glm-4.7` ($0.6/1M)

**MiniMax (`minimax/`):** `MiniMax-M2.7`, `MiniMax-M2.5` ($0.2/1M)

**Kimi (`kimi/`):** `kimi-k2.5`, `kimi-k2.5-thinking` ($9/mo flat)

**Vertex AI (`vertex/`):** `gemini-3.1-pro`, `gemini-3-flash`, plus partner models ($300 free credits)

---

## 🐛 Troubleshooting

| Problem | Solution |
| --------- | ---------- |
| "Language model did not provide messages" | Provider quota exhausted — check dashboard tracker or use combo fallback |
| Rate limiting | Add fallback: `cc/claude-opus-4-7 → glm/glm-5.1 → kr/claude-sonnet-4.5` |
| OAuth token expired | Dashboard → Provider → Reconnect (auto-refresh should handle this) |
| High costs | Enable RTK (saves 20-40%), use free tiers for non-critical tasks |
| First login not working | Check `INITIAL_PASSWORD` in `.env` (default: `123456`) |

---

## 🛠️ Tech Stack

Node.js 20+ • Next.js 16 • React 19 • Tailwind CSS 4 • SQLite (better-sqlite3 / sql.js) • SSE Streaming • OAuth 2.0 PKCE + JWT

---

## 📝 API Reference

```bash
# Chat completions
POST http://localhost:20127/v1/chat/completions
Authorization: Bearer your-api-key
{"model": "cc/claude-opus-4-7", "messages": [{"role": "user", "content": "..."}], "stream": true}

# List models
GET http://localhost:20127/v1/models
Authorization: Bearer your-api-key
```
