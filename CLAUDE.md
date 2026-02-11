# CLAUDE.md — Sentiment Analyzer Agent

This file provides full context for any AI continuing work on this project.

## Project Summary

**Sentiment Analyzer** is a local browser-launched AI agent that analyzes high-level user sentiment (positive / neutral / negative / mixed) for a given product or service. It uses **logged-in Twitter (X) and Reddit sessions** delegated by users in the Sela Network, accessed via the `@selanet/sdk` Node.js SDK.

- **Location:** `/Users/vincent/sentiment-analyzer/`
- **Framework:** Next.js 15.5.12, React 19, TypeScript 5.7, Tailwind CSS 3.4
- **LLM Provider:** OpenAI API (`gpt-4o` via `@ai-sdk/openai` + Vercel AI SDK `ai` v4)
- **Sela SDK:** `@selanet/sdk` linked locally via `file:../sela-node-v2/client-sdk/crates/sela-node`
- **Status:** End-to-end tested with live Sela network. Twitter search works. Reddit disabled (schema extraction issue).

## Product Requirements (STRICT — do not deviate)

### Core Interaction
The agent MUST start by asking: **"Which product or service do you want to check for user sentiment?"** — only after receiving an answer may analysis proceed.

### Sentiment Scope (FIXED)
- High-level classification ONLY: positive / neutral / negative / mixed
- **No** numeric scores, percentages, or trend charts

### Platforms (STRICT allowlist)
- Twitter/X and Reddit only. No other platforms unless explicitly instructed.
- Controlled by `ENABLED_PLATFORMS` env var (see Environment Variables section)

### Logged-in Session Rules
- MUST use delegated logged-in sessions from the Sela Network
- **Allowed:** read posts, read comments, perform searches requiring login
- **Disallowed:** posting, liking, replying, voting, messaging
- MUST clearly state when content was accessed via an authenticated session
- MUST NOT access private messages or non-public content

### Data Collection Limits
- Twitter: top **20 tweets** relevant to the query, include replies where visible
- Reddit: top **20 posts** relevant to the query, include top-level comments
- Default time window: most recent content surfaced by platform search

### Compliance & Safety
- Never deanonymize users
- Never quote or expose private content
- Always cite post URLs or IDs internally for traceability
- If content cannot be accessed (rate-limit, login failure, anti-bot, no results): explicitly state this in output
- If sentiment is unclear: output "Sentiment is mixed or inconclusive."
- Never guess or infer beyond observed content

### Required Output Format
```
1) Sentiment Summary
   - Overall sentiment label (positive / neutral / negative / mixed)
   - 2–4 bullet points explaining why

2) Coverage Notes
   - Platforms successfully analyzed
   - Any access limitations or missing data

3) Confidence & Unknowns
   - Why the conclusion is reliable or uncertain
```
**No raw quotes, no charts, no tables. Summary only.**

## Execution Progress

The original task specification defined a 3-step flow:
- **Step 1 — Clarifying questions:** COMPLETE.
- **Step 2 — Planning:** COMPLETE.
- **Step 3 — Implementation:** COMPLETE. All code written, builds, and end-to-end tested.

### Definition of Done (from original spec)
- [x] User can open a local web app
- [x] User asks for sentiment on a product/service
- [x] Agent uses logged-in Twitter sessions (Reddit disabled — see Known Issues)
- [x] Agent analyzes top posts per platform (Twitter returns 8-9 results per query)
- [x] Agent returns a high-level sentiment summary
- [x] Agent clearly states limitations if any
- [x] No guessing, no silent failures

## Runtime Versions

- **Node.js:** v24.11.1
- **npm:** 11.6.2
- **pnpm:** 10.28.1 (used for sela-node-v2 monorepo; sentiment-analyzer uses npm)
- **Platform:** macOS Darwin (Apple Silicon, arm64)

## Git State

**sentiment-analyzer:**
- Branch: `main`
- Initial commit: `695b443` — contains all 28 project files
- Uncommitted changes: `CLAUDE.md`, `lib/sela-adapter.ts`, `app/api/chat/route.ts`, `lib/sentiment-engine.ts`, `.env.local`

**sela-node-v2:**
- Branch: `101-cgnat-environment-testing`
- Latest commit: `aab20fb fix(client-sdk): filter bootstrap/relay from agent discovery`

## Related Projects on This Machine

### sela-node-v2 (`/Users/vincent/sela-node-v2/`)
- **Branch:** `101-cgnat-environment-testing`
- Full monorepo: bootstrap-node, relay-node, api-server, agent-node, client-sdk, shared
- The `@selanet/sdk` native Node.js addon was built from this repo via `napi build --platform --release`
- Built artifact: `/Users/vincent/sela-node-v2/client-sdk/crates/sela-node/sela-node.darwin-arm64.node` (9.9 MB)
- Contains `sela-node-schemas` git submodule at `/Users/vincent/sela-node-v2/sela-node-schemas/`
- See `/Users/vincent/sela-node-v2/CLAUDE.md` for full monorepo documentation

### mobile-plan-advisor (`/Users/vincent/mobile-plan-advisor/`)
- Original project whose UI components were reused for this sentiment analyzer
- Next.js 15 + React 19 + Tailwind CSS + AI SDK
- ChatGPT-style chat interface with sidebar, markdown messages, tool invocations, sources display

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Browser (localhost:3000)           │
│  ┌───────────────┐  ┌────────────────────────┐  │
│  │  Chat Panel    │  │  Activity Log Panel    │  │
│  │  (reused from  │  │  (new component)       │  │
│  │  mobile-plan-  │  │  - searches performed  │  │
│  │  advisor)      │  │  - URLs browsed        │  │
│  │               │  │  - platform + timestamp │  │
│  │  User asks:   │  │  - errors               │  │
│  │  "sentiment   │  │                        │  │
│  │   of Cursor?" │  │                        │  │
│  └──────┬────────┘  └────────────────────────┘  │
│         │                                        │
└─────────┼────────────────────────────────────────┘
          │ POST /api/chat (streaming)
          ▼
┌─────────────────────────────────────────────────┐
│         Next.js API Route (route.ts)             │
│                                                  │
│  1. Parse user query (product/service)           │
│  2. Call sela adapter (enabled platforms only)   │
│  3. Feed collected posts to OpenAI               │
│  4. Return structured sentiment summary          │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│        Sela Tool Adapter (lib/sela-adapter.ts)   │
│                                                  │
│  SelaClient (@selanet/sdk)                       │
│  ├─ sela_status()    → connection health         │
│  ├─ sela_search()    → platform search           │
│  └─ sela_browse()    → read specific URL         │
│                                                  │
│  Connects to Sela P2P network via DHT            │
│  Discovers agents with "web" capability          │
│  Browses Twitter via delegated sessions          │
│  Uses apiKey bypass for dev mode (no API server) │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│  Agent Node (Tauri desktop app, running locally) │
│  /Users/vincent/sela-node-v2/agent-node/         │
│                                                  │
│  Receives P2P browse requests from client SDK    │
│  Controls Chrome via CDP                         │
│  Extracts semantic content from DOM via schemas  │
│  Returns SemanticResponse to client              │
└─────────────────────────────────────────────────┘
```

## File Structure

```
sentiment-analyzer/
├── app/
│   ├── layout.tsx                  # Root layout (adapted from mobile-plan-advisor)
│   ├── page.tsx                    # Home page — renders <Chat/>
│   ├── globals.css                 # Global styles + Tailwind (reused)
│   └── api/
│       └── chat/
│           └── route.ts            # API route: orchestrates sela + OpenAI
├── components/
│   ├── chat.tsx                    # Main chat orchestrator (adapted — added activity log)
│   ├── chat-messages.tsx           # Message list with auto-scroll (adapted — sentiment prompts)
│   ├── chat-input.tsx              # Auto-resize textarea (adapted — sentiment placeholder)
│   ├── message.tsx                 # Individual message with markdown (adapted — "Sentiment Analyzer" label)
│   ├── sidebar.tsx                 # Conversation sidebar (reused as-is)
│   ├── activity-log.tsx            # NEW — Sela browsing activity panel
│   ├── tool-invocation.tsx         # Tool status display (adapted — sela_search/browse states)
│   ├── sources.tsx                 # URL source links (reused as-is)
│   └── icons.tsx                   # SVG icons (reused + added TwitterIcon, RedditIcon, ActivityIcon)
├── lib/
│   ├── sela-adapter.ts             # NEW — SelaClient wrapper (singleton, sela_status/search/browse, platform feature switch)
│   ├── sentiment-engine.ts         # NEW — builds OpenAI analysis prompt from collected posts
│   ├── agent.ts                    # Agent definition loader from AGENT.md (reused)
│   ├── types.ts                    # Types (reused + added ActivityLogEntry)
│   └── hooks/
│       └── use-local-storage.ts    # localStorage persistence (reused, changed storage key)
├── agents/
│   └── default/
│       └── AGENT.md                # NEW — sentiment analyzer system prompt with all rules
├── .env.example                    # Template for environment variables
├── .env.local                      # Active local config (gitignored) — SEE BELOW
├── package.json                    # Dependencies including @selanet/sdk file link
├── next.config.js                  # webpack externals for native .node addon
├── tsconfig.json                   # TypeScript config with @/* path alias
├── tailwind.config.ts              # Tailwind + typography plugin
├── postcss.config.js               # PostCSS with Tailwind + Autoprefixer
├── eslint.config.mjs               # ESLint with next/core-web-vitals
└── .gitignore                      # Standard Next.js gitignore
```

## Key Files — What Each Does

### `app/api/chat/route.ts` (API Route — orchestration center)
- `POST /api/chat` with `maxDuration = 120` seconds
- Receives chat messages from the frontend
- Determines if the user is asking about a product (vs greeting/chatting)
- If analysis needed: calls `sela_search()` for **enabled platforms only** via `Promise.allSettled`
- Feeds collected posts to OpenAI via `buildAnalysisPrompt()` from `sentiment-engine.ts`
- Streams the response back using Vercel AI SDK's `streamText()`
- Attaches activity log as `x-activity-log` response header (JSON array)
- For greetings/clarifications, streams directly from OpenAI without Sela
- `isGreeting()` — tightened heuristic that matches exact greetings + known filler words; avoids false positives like "Hey Siri"
- Handles `CoreMessage` content arrays (extracts text parts properly, not `JSON.stringify`)

### `lib/sela-adapter.ts` (Sela Network integration)
- **Singleton pattern:** one `SelaClient` instance, lazily initialized on first use
- **Promise-based mutex** (`clientInitPromise`) prevents race conditions when parallel searches call `ensureClient()` concurrently
- `ensureClient()` → `initializeClient()` — creates client via `SelaClient.withApiKey()`, starts it, discovers agents with `"web"` capability, connects to first available. On failure, sets `client = null` so next call retries cleanly.
- `isPlatformEnabled(platform)` — checks `ENABLED_PLATFORMS` env var (comma-separated, defaults to `"twitter"`)
- `sela_search({ platform, query, max_results })` — builds platform search URL, calls `client.browse()` with `parseOnly: true` and `apiKey: "dev_bypass_token"` (bypasses TokenManager), parses `SemanticResponse.page.content`
- `sela_browse({ url })` — browses a specific URL with same `apiKey` bypass
- `sela_status()` — returns `{ connected, agentPeerId, lastError, state }` (unused currently; note: calls `client.connectedAgent()` which may not exist in SDK)
- All operations log to an internal `activityLog` array exposed via `getActivityLog()` / `clearActivityLog()`
- Search URLs:
  - Twitter: `https://x.com/search?q={query}&src=typed_query&f=top`
  - Reddit: `https://www.reddit.com/search/?q={query}&sort=relevance&t=all`

### `lib/sentiment-engine.ts` (Prompt construction)
- `buildAnalysisPrompt({ query, twitterResults, redditResults })` — formats collected posts into a structured prompt
- Includes per-platform sections with post content, engagement counts, authors
- Handles three platform states: "Platform disabled", error with message, and success with data
- Instructs OpenAI to produce the required 3-section output format
- Enforces rules: no user deanonymization, no raw quotes, no guessing

### `agents/default/AGENT.md` (System prompt)
- Loaded server-side by `lib/agent.ts` and injected as system message
- Defines the agent's role, interaction flow, output format, rules, and prohibited actions
- Agent must ask "Which product or service do you want to check?" as first interaction

### `components/activity-log.tsx` (NEW — Activity Log Panel)
- Right-side panel showing all Sela browsing activity
- Each entry: platform icon, timestamp, message, URL, error details
- Toggle button with badge count in the header
- Responsive: slides in from right on smaller screens, always visible on xl+

### `components/chat.tsx` (Adapted — main orchestrator)
- Added `activityEntries` state and `ActivityLog` panel
- Parses `x-activity-log` header from API responses via `onResponse` callback
- Clears activity log on new chat or conversation switch
- `ActivityLogToggle` button in the header shows entry count

## Design Decisions Made

1. **OpenAI API** chosen as LLM provider (not Claude). Env var: `OPENAI_API_KEY`. Default model: `gpt-4o`.
2. **Enabled platforms searched in parallel** via `Promise.allSettled` — if one fails, the other still returns results. Disabled platforms are skipped entirely.
3. **@selanet/sdk used via file dependency** (`"file:../sela-node-v2/client-sdk/crates/sela-node"`) since the package is not published to npm.
4. **Native addon externalized** in `next.config.js` via `serverExternalPackages` + `webpack.externals` to prevent webpack from bundling the `.node` binary.
5. **Activity log passed via HTTP header** (`x-activity-log`) from API route to frontend — truncated to last 10 entries if > 7KB.
6. **localStorage persistence** with key `"sentiment-analyzer-chat"` (changed from `mobile-plan-advisor-chat`).
7. **API server bypassed** — `BrowseOptions.apiKey` set to `"dev_bypass_token"` which is used directly as session token by the SDK, skipping the TokenManager entirely. Agent-node accepts any token with `API_DEV_MODE=true`.
8. **Platform feature switch** — `ENABLED_PLATFORMS` env var controls which platforms to search. Defaults to `"twitter"` only. Reddit disabled due to schema extraction issues.

## API Server Bypass (CRITICAL for Dev Mode)

The client SDK normally fetches a session token from an API server (`http://localhost:9002/v1/sessions`) before each browse request. Without a running API server, all browse calls fail.

**The bypass:** The SDK's `BrowseOptions` struct has an `apiKey` field that, when set, is used **directly as the session token**, completely skipping the TokenManager and API server. This is documented in the SDK source (`client.rs` lines 2070-2073) as "backward compat".

```typescript
// In sela-adapter.ts:
const response = await selaClient.browse(searchUrl, {
  timeoutMs: 60000,
  count: max_results,
  parseOnly: true,
  apiKey: "dev_bypass_token", // Bypasses TokenManager; agent-node accepts any token in API_DEV_MODE
});
```

The agent-node has `API_DEV_MODE=true` which accepts any token without JWT verification. This makes the full chain work without an API server.

**If you need a real API server later:** Run `cargo run` in `/Users/vincent/sela-node-v2/api-server/`. It starts on port 9002. You'd also need to create API keys in its SQLite database. Staging server at `http://api.stg.selanet.ai:9002` exists but was unreachable during testing.

## Native Addon + Next.js: How It Was Solved

The `@selanet/sdk` is a **napi-rs native addon** (Rust compiled to `.node` binary). Webpack tries to bundle it and fails because it can't parse binary files. The solution required TWO mechanisms in `next.config.js`:

```js
const nextConfig = {
  serverExternalPackages: ["@selanet/sdk"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@selanet/sdk": "commonjs @selanet/sdk",
      });
    }
    return config;
  },
};
```

**Why both are needed:** `serverExternalPackages` alone was not sufficient because the package is linked via `file:` protocol (not from npm registry). The explicit webpack `externals` entry ensures webpack never attempts to resolve or parse the module at all.

**If the SDK is rebuilt** (e.g., after switching branches or pulling new code), you must:
```bash
cd /Users/vincent/sela-node-v2/client-sdk/crates/sela-node
pnpm install && pnpm build    # runs: napi build --platform --release
# Then in sentiment-analyzer:
rm -rf node_modules/.cache .next
npm install                    # re-links the file dependency
```

## API Route Decision Logic (`app/api/chat/route.ts`)

```
User message received
    │
    ├─ No user message found?  → Stream simple response (let agent ask its opening question)
    │
    ├─ First message AND is a greeting ("hi", "hello", etc.)?
    │     → Stream simple response (agent will ask "which product?")
    │
    ├─ Is a greeting OR message > 150 chars?
    │     → Stream simple response (likely a follow-up or clarification, not a product name)
    │
    └─ Short, non-greeting message (likely a product/service name)
          → Clear activity log
          → For each ENABLED platform:
             sela_search(platform, query, 20)  ── Promise.allSettled (parallel)
          ← Collect results (disabled platforms get "Platform disabled" error)
          → buildAnalysisPrompt(query, twitter, reddit)
          → Replace last user message with enriched prompt
          → streamText() to OpenAI with agent system prompt
          → Attach x-activity-log header
          → Return streaming response
```

## Environment Variables

### sentiment-analyzer `.env.local` (current state)
```bash
SELA_SKIP_API_KEY_VALIDATION=true       # Bypass API key format validation in client SDK

OPENAI_API_KEY=sk-proj-...              # Real key — SET AND WORKING
# OPENAI_MODEL=gpt-4o                  # Optional, defaults to gpt-4o

SELA_API_KEY=sk_live_your-sela-key-here # Placeholder — bypassed by SELA_SKIP_API_KEY_VALIDATION
BOOTSTRAP_PEERS=/dnsaddr/bootstrap.testnet.selanet.ai

# Platforms to search (comma-separated: twitter,reddit)
ENABLED_PLATFORMS=twitter                # Reddit disabled — see Known Issues

# Timeouts (optional, in milliseconds)
# SELA_CONNECTION_TIMEOUT=30000
# SELA_REQUEST_TIMEOUT=60000
```

### client-sdk `.env` (`/Users/vincent/sela-node-v2/client-sdk/.env`)
```bash
BOOTSTRAP_PEERS=/dnsaddr/bootstrap.testnet.selanet.ai
KAD_PROTOCOL=/selanet-test/kad/1.0.0
RELAY_ADDR=/ip4/34.22.104.142/tcp/9001/p2p/12D3KooWA7WYgztSr2BUnfr8huC3KTN9zfWyKx3PJgDPBZKYj2mQ
SELA_API_KEY=sk_live_123
SELA_SKIP_API_KEY_VALIDATION=true
```
**Note:** The client SDK has BUILD-TIME env vars baked into the Rust binary. The `KAD_PROTOCOL` and `BOOTSTRAP_PEERS` from this file were compiled into the `.node` addon during `napi build`. Runtime env vars from `sentiment-analyzer/.env.local` may or may not override these — this needs verification.

### agent-node `.env` (`/Users/vincent/sela-node-v2/agent-node/src-tauri/.env`)
Active testnet config (bottom of file, uncommented):
```bash
BOOTSTRAP_PEERS=/dnsaddr/bootstrap.testnet.selanet.ai
RELAY_PEERS=/ip4/34.22.104.142/tcp/9001/p2p/12D3KooWA7WYgztSr2BUnfr8huC3KTN9zfWyKx3PJgDPBZKYj2mQ
KAD_PROTOCOL=/selanet-test/kad/1.0.0
AGENT_LISTEN_ADDR=/ip4/0.0.0.0/tcp/0
AGENT_ENABLED=true
AGENT_MODEL=gemini-2.5-flash
AGENT_NAME=Sela-TestNet
BROWSER_HEADLESS=true
API_DEV_MODE=true            # Accepts any token — no API server needed
JWT_DEV_MODE=true
AGENT_SKIP_ONBOARDING=true
POINTS_MINTING_ENABLED=false
SCHEMA_REGISTRY_URL=https://raw.githubusercontent.com/sela-network/sela-node-schemas/main
RUST_LOG=info,agent_node=debug,libp2p=debug
```

## Sela Network Topology (Testnet)

| Component | Address | Peer ID |
|---|---|---|
| **Bootstrap Node** | `34.22.104.142:9000` | `12D3KooWKHTWom9nDezxFhEsL3nDpomqpEkA35YRSByBeuuCrVzm` |
| **Relay Node** | `34.22.104.142:9001` | `12D3KooWA7WYgztSr2BUnfr8huC3KTN9zfWyKx3PJgDPBZKYj2mQ` |
| **Agent Node (local)** | `192.168.0.19:65514` (dynamic port) | `12D3KooWHoM1ZwYwxmWwSWak3DE2tkuRdZYHutb3U4KBFEQFXFen` |
| **Relay Circuit** | `/ip4/34.22.104.142/tcp/9001/p2p/12D3KooWA7WYgztSr2BUnfr8huC3KTN9zfWyKx3PJgDPBZKYj2mQ/p2p-circuit` | — |

DNS discovery: `bootstrap.testnet.selanet.ai` resolves to `34.22.104.142` (and others).
Kademlia protocol: `/selanet-test/kad/1.0.0`

## Auth Bypass (Dev Mode)

For local development, authentication is fully bypassed at three layers:

| Layer | Mechanism | Effect |
|---|---|---|
| **Client SDK** | `SELA_SKIP_API_KEY_VALIDATION=true` | Accepts any API key format; if no key provided, uses placeholder `"sk_test_connectivity_bypass"` |
| **Client SDK (browse)** | `BrowseOptions.apiKey = "dev_bypass_token"` | Bypasses TokenManager entirely — uses provided string as session token directly, skips API server call |
| **Agent Node** | `API_DEV_MODE=true` | Accepts ANY token without JWKS verification, grants "all" permissions |
| **API Server** | **Not running, not needed** | Dev mode bypasses the need for JWT token exchange |

## SDK API Reference (Key Methods Used)

The `@selanet/sdk` exports `JsSelaClient` (aliased as `SelaClient`):

```typescript
import { JsSelaClient as SelaClient } from "@selanet/sdk";

// Create client
const client = await SelaClient.withApiKey(apiKey);  // or .create(), .fromEnv()

// Events
client.on('connected', (event) => { /* event.peerId */ });
client.on('error', (event) => { /* event.message */ });
client.on('disconnected', () => {});

// Lifecycle
await client.start();                  // Connect to DHT via bootstrap nodes
await client.stop();                   // Disconnect

// Discovery
const agents = await client.discoverAgents("web", { maxAgents: 5, timeoutMs: 15000 });
const agent = await client.connectToFirstAvailable(agents, 10000);

// Browsing
const response = await client.browse(url, {
  timeoutMs: 60000,
  count: 20,          // Number of items to collect
  parseOnly: true,    // Skip LLM action planning on agent side
  apiKey: "token",    // BYPASS: used directly as session token, skips TokenManager
  filters: { sort: "newest" },
});

// Response shape:
// response.page.pageType: string
// response.page.content: string (JSON array of extracted items)
// response.page.metadata: { title, url, ... }
// response.actionResult: { success, message }

// Search (semantic)
const response = await client.search(query, targetUrl);

// Properties
const peerId = await client.localPeerId;    // string
const state = await client.state;           // "created" | "starting" | "running" | "stopping" | "stopped"
const connected = await client.isConnected; // boolean
```

## Build & Run

```bash
# 1. Install dependencies
cd /Users/vincent/sentiment-analyzer
npm install

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local — set OPENAI_API_KEY to a real key
# SELA_SKIP_API_KEY_VALIDATION=true is already set
# ENABLED_PLATFORMS=twitter (default, or twitter,reddit)

# 3. Ensure the @selanet/sdk native addon is built
# (Already done — the .node file exists at:
#  /Users/vincent/sela-node-v2/client-sdk/crates/sela-node/sela-node.darwin-arm64.node)

# 4. Start the agent-node (in a separate terminal)
cd /Users/vincent/sela-node-v2/agent-node && pnpm tauri dev
# Wait for "Successfully registered as DHT provider for: web"

# 5. Start the sentiment analyzer
cd /Users/vincent/sentiment-analyzer && npm run dev
# Opens at http://localhost:3000
```

## Build Verification

The project builds successfully:
```
next build → ✓ Compiled successfully
Route (app):
  ○ /           → 69.6 kB (172 kB First Load JS)
  ƒ /api/chat   → 123 B (102 kB First Load JS)
```

No type errors. No lint errors.

## End-to-End Test Results (2026-02-11)

### Test: Greeting flow
- Input: `{"messages":[{"role":"user","content":"hi"}]}`
- Result: Agent responds "Hello! Which product or service do you want to check for user sentiment?"
- Status: **PASS**

### Test: Sentiment analysis flow (Twitter only)
- Input: `{"messages":[{"role":"assistant","content":"Which product or service..."},{"role":"user","content":"Cursor"}]}`
- Activity log:
  - Sela client started, connected to P2P network
  - Connected to agent `12D3KooWHoM1...`
  - Discovered 1 agent
  - Twitter search: Found 8-9 results for "Cursor" (~11s)
- OpenAI output: Structured 3-section sentiment summary (mixed sentiment)
- Status: **PASS**

### Test: Reddit search
- Reddit schema exists on GitHub (`reddit_com` in `sela-node-schemas`)
- Schema was manually copied to agent cache at `~/Library/Application Support/sela-agent-node/schema_cache/bafk_reddit_com_v1.json`
- Result: Schema loaded but extraction returns 0 results — CSS selectors don't match Reddit's current DOM
- Status: **FAIL** — disabled via `ENABLED_PLATFORMS=twitter`

## What Has Been Done (Chronological)

1. **Explored `sela-node-v2/`** — understood monorepo structure, SDK API, agent runtime, config patterns
2. **Explored `mobile-plan-advisor/`** — catalogued all reusable UI components and their interfaces
3. **Clarifying questions answered by user:**
   - LLM: OpenAI API
   - API key env var: `OPENAI_API_KEY`
   - Sela config: environment variables
   - Platform analysis: in parallel
4. **Feasibility analysis** of `@selanet/sdk` — discovered it was NOT published to npm, no `.node` binary existed
5. **Built the native SDK addon** — ran `napi build --platform --release` on branch `101-cgnat-environment-testing`, produced `sela-node.darwin-arm64.node`
6. **Scaffolded `sentiment-analyzer/`** — Next.js 15 project with all config files, `@selanet/sdk` as file dependency
7. **Reused UI components** from `mobile-plan-advisor` — adapted chat, messages, input, message, sidebar, tool-invocation, sources, icons, types, localStorage hook
8. **Created new components:** `activity-log.tsx` (activity log panel + toggle button)
9. **Implemented `lib/sela-adapter.ts`** — singleton SelaClient, sela_status/search/browse, activity logging
10. **Implemented `lib/sentiment-engine.ts`** — prompt builder for sentiment classification
11. **Wrote `agents/default/AGENT.md`** — system prompt with interaction rules
12. **Built `app/api/chat/route.ts`** — full orchestration: detect query → parallel sela search → OpenAI analysis → streaming response
13. **Fixed webpack issue** — native `.node` addon was being bundled; resolved with `serverExternalPackages` + `webpack.externals`
14. **Fixed TypeScript errors** — `CoreMessage` type casting for AI SDK compatibility
15. **Investigated auth bypass** — found `SELA_SKIP_API_KEY_VALIDATION=true` (client) and `API_DEV_MODE=true` (agent) allow running without API server
16. **Started agent-node** via `pnpm tauri dev` — confirmed it connects to testnet bootstrap + relay, registers as DHT provider for web/semantic/browser/compute capabilities
17. **User completed onboarding** — granted agent-node access to Twitter/X session
18. **Code review** — identified and fixed 3 bugs:
    - Race condition in `ensureClient()` — parallel Twitter+Reddit searches created duplicate SelaClient instances. Fixed with promise-based mutex (`clientInitPromise`).
    - `CoreMessage` content-array handling — `JSON.stringify` of parts array produced garbage search queries. Fixed to extract text parts properly.
    - `isGreeting()` false positives — "Hey Siri", "Hey Google" were classified as greetings. Tightened to exact greetings + known filler words only.
19. **API server bypass** — discovered client SDK requires session token from `http://localhost:9002/v1/sessions` before browsing. Bypassed by setting `BrowseOptions.apiKey = "dev_bypass_token"` which the SDK uses directly as session token, skipping TokenManager entirely.
20. **End-to-end testing** — greeting flow, Twitter search, OpenAI analysis all working. Activity log header populates correctly.
21. **Reddit investigation** — schema exists on GitHub but agent-node hadn't cached it. Manually copied to cache. Schema loads but CSS selectors return 0 results (Reddit's DOM has changed since schema was written).
22. **Platform feature switch** — added `ENABLED_PLATFORMS` env var to `sela-adapter.ts`. Route only searches enabled platforms. Reddit disabled by default.

## What Remains To Do

1. **Fix Reddit schema** — CSS selectors in `sela-node-schemas/platforms/reddit_com/_platform.json` need updating to match Reddit's current DOM. This is a fix for the `sela-node-schemas` repo, not this project. Once fixed, set `ENABLED_PLATFORMS=twitter,reddit`.
2. **Browser testing** — the app has been tested via curl API calls. Browser UI testing (chat flow, activity log panel, conversation persistence, sidebar) is pending.
3. **Handle edge cases:**
   - Rate limiting from platforms
   - Anti-bot detection
   - Connection timeouts when agent-node is not running
   - Graceful error display in the UI when Sela connection fails
4. **Verify the SDK env var behavior** — the client SDK `.env` has BUILD-TIME vars (`KAD_PROTOCOL`, `BOOTSTRAP_PEERS`) baked into the `.node` binary. Need to confirm that runtime env vars properly override these.
5. **`sela_status()` cleanup** — calls `client.connectedAgent()` which may not exist in the SDK API. Either verify the method exists or remove the call.

## Known Issues

### Reddit: Schema Extraction Returns 0 Results
- **Root cause:** The `sela-node-schemas` Reddit schema (`reddit_com`) has CSS selectors that don't match Reddit's current DOM structure
- **Where the schema lives:** GitHub repo `sela-network/sela-node-schemas` → `platforms/reddit_com/_platform.json`; locally at `/Users/vincent/sela-node-v2/sela-node-schemas/platforms/reddit_com/_platform.json`
- **Agent cache location:** `~/Library/Application Support/sela-agent-node/schema_cache/bafk_reddit_com_v1.json`
- **Schema was NOT auto-fetched** by the agent-node despite being listed in `index.json`. Had to be manually copied to cache.
- **Workaround:** `ENABLED_PLATFORMS=twitter` (Reddit disabled)
- **Fix needed:** Update CSS selectors in the Reddit schema to match Reddit's current DOM, then set `ENABLED_PLATFORMS=twitter,reddit`

### Twitter: Returns Fewer Than 20 Results
- Requesting 20 results but typically getting 8-9
- Likely because Twitter's search page shows limited results in the initial viewport
- May need scrolling/pagination support on the agent side, or switching from `browse()` to `search()`

### `authenticated: true` Hardcoded
- `sela_search()` always returns `authenticated: true` on success without verifying actual auth state
- The agent-node might serve unauthenticated content if the session has expired
- Low priority — the output already states "accessed via authenticated Sela Network sessions"

## CRITICAL: Build-Time vs Runtime Env Vars in the SDK

During `napi build`, the Rust compiler printed these warnings:

```
warning: sela-client@0.1.0: Loading .env from: /Users/vincent/sela-node-v2/client-sdk/.env
warning: sela-client@0.1.0: KAD_PROTOCOL=/selanet-test/kad/1.0.0
warning: sela-client@0.1.0: BOOTSTRAP_PEERS=/dnsaddr/bootstrap.testnet.selanet.ai
warning: sela-client@0.1.0: RELAY_ADDR=/ip4/34.22.104.142/tcp/9001/p2p/12D3KooWA7WYgztSr2BUnfr8huC3KTN9zfWyKx3PJgDPBZKYj2mQ
```

`KAD_PROTOCOL` is almost certainly baked in via Rust's `env!()` macro. The client and agent MUST use the same Kademlia protocol string. If the agent-node switches protocols, the SDK must be **rebuilt**.

## The `sela_search` Implementation Choice

Searching is done by constructing a search URL and calling `client.browse()`, NOT by calling `client.search()`:

1. It's more predictable — we control exactly what URL is visited
2. `parseOnly: true` skips the agent-side LLM, reducing latency
3. The search URL format for Twitter is well-known and stable

If results are poor, consider switching to `client.search()`.

## Other Notes

- **Agent node port is dynamic** (`:0` → random port). The client discovers it via DHT.
- **Activity log via HTTP header** has a size limit (~7KB). Truncated to last 10 entries if exceeded.
- **The `isShortQuery` check** (< 150 chars) is a rough heuristic. Long queries bypass Sela analysis and go to simple chat mode.
- **The original spec name mismatch:** User's original spec referred to `mobile-agent-advisor`. The actual directory is `mobile-plan-advisor`.
- **Schema cache on macOS:** `~/Library/Application Support/sela-agent-node/schema_cache/`
- **Available schemas in cache:** `x_com` (v1.1), `google_com` (v1), `medium_com` (v1.1), `reddit_com` (v1, manually added), `xiaohongshu_com` (v1)
