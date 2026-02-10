# CLAUDE.md — Sentiment Analyzer Agent

This file provides full context for any AI continuing work on this project.

## Project Summary

**Sentiment Analyzer** is a local browser-launched AI agent that analyzes high-level user sentiment (positive / neutral / negative / mixed) for a given product or service. It uses **logged-in Twitter (X) and Reddit sessions** delegated by users in the Sela Network, accessed via the `@selanet/sdk` Node.js SDK.

- **Location:** `/Users/vincent/sentiment-analyzer/`
- **Framework:** Next.js 15.5.12, React 19, TypeScript 5.7, Tailwind CSS 3.4
- **LLM Provider:** OpenAI API (`gpt-4o` via `@ai-sdk/openai` + Vercel AI SDK `ai` v4)
- **Sela SDK:** `@selanet/sdk` linked locally via `file:../sela-node-v2/client-sdk/crates/sela-node`
- **Status:** Code complete, builds successfully. Not yet tested end-to-end with live Sela network.

## Product Requirements (STRICT — do not deviate)

### Core Interaction
The agent MUST start by asking: **"Which product or service do you want to check for user sentiment?"** — only after receiving an answer may analysis proceed.

### Sentiment Scope (FIXED)
- High-level classification ONLY: positive / neutral / negative / mixed
- **No** numeric scores, percentages, or trend charts

### Platforms (STRICT allowlist)
- Twitter/X and Reddit only. No other platforms unless explicitly instructed.

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
- **Step 1 — Clarifying questions:** COMPLETE. User answered: OpenAI API, `OPENAI_API_KEY`, env vars for sela config, parallel analysis.
- **Step 2 — Planning:** COMPLETE. Full architecture plan was presented and approved.
- **Step 3 — Implementation:** IN PROGRESS. All code written and builds. Agent-node is running. User is completing onboarding (granting Twitter/X and Reddit access to the agent-node). End-to-end testing has NOT happened yet.

### Definition of Done (from original spec)
- [ ] User can open a local web app
- [ ] User asks for sentiment on a product/service
- [ ] Agent uses logged-in Twitter + Reddit sessions
- [ ] Agent analyzes top 20 posts per platform
- [ ] Agent returns a high-level sentiment summary
- [ ] Agent clearly states limitations if any
- [ ] No guessing, no silent failures

## Runtime Versions

- **Node.js:** v24.11.1
- **npm:** 11.6.2
- **pnpm:** 10.28.1 (used for sela-node-v2 monorepo; sentiment-analyzer uses npm)
- **Platform:** macOS Darwin (Apple Silicon, arm64)

## Git State

**sentiment-analyzer:**
- Branch: `main`
- Initial commit: `695b443` — contains all 28 project files
- Uncommitted: `CLAUDE.md` (this file)

**sela-node-v2:**
- Branch: `101-cgnat-environment-testing`
- Latest commit: `aab20fb fix(client-sdk): filter bootstrap/relay from agent discovery`

## Related Projects on This Machine

### sela-node-v2 (`/Users/vincent/sela-node-v2/`)
- **Branch:** `101-cgnat-environment-testing`
- Full monorepo: bootstrap-node, relay-node, api-server, agent-node, client-sdk, shared
- The `@selanet/sdk` native Node.js addon was built from this repo via `napi build --platform --release`
- Built artifact: `/Users/vincent/sela-node-v2/client-sdk/crates/sela-node/sela-node.darwin-arm64.node` (9.9 MB)
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
│  2. Call sela adapter (Twitter + Reddit parallel)│
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
│  Browses Twitter/Reddit via delegated sessions   │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│  Agent Node (Tauri desktop app, running locally) │
│  /Users/vincent/sela-node-v2/agent-node/         │
│                                                  │
│  Receives P2P browse requests from client SDK    │
│  Controls Chrome via CDP                         │
│  Extracts semantic content from DOM              │
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
│   ├── sela-adapter.ts             # NEW — SelaClient wrapper (singleton, sela_status/search/browse)
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
- If analysis needed: calls `sela_search()` for Twitter AND Reddit **in parallel** via `Promise.allSettled`
- Feeds collected posts to OpenAI via `buildAnalysisPrompt()` from `sentiment-engine.ts`
- Streams the response back using Vercel AI SDK's `streamText()`
- Attaches activity log as `x-activity-log` response header (JSON array)
- For greetings/clarifications, streams directly from OpenAI without Sela

### `lib/sela-adapter.ts` (Sela Network integration)
- **Singleton pattern:** one `SelaClient` instance, lazily initialized on first use
- `ensureClient()` — creates client via `SelaClient.withApiKey()`, starts it, discovers agents with `"web"` capability, connects to first available
- `sela_status()` — returns `{ connected, agentPeerId, lastError, state }`
- `sela_search({ platform, query, max_results })` — builds platform search URL, calls `client.browse()` with `parseOnly: true`, parses `SemanticResponse.page.content` (JSON array of extracted items)
- `sela_browse({ url })` — browses a specific URL
- All operations log to an internal `activityLog` array exposed via `getActivityLog()` / `clearActivityLog()`
- Search URLs:
  - Twitter: `https://x.com/search?q={query}&src=typed_query&f=top`
  - Reddit: `https://www.reddit.com/search/?q={query}&sort=relevance&t=all`

### `lib/sentiment-engine.ts` (Prompt construction)
- `buildAnalysisPrompt({ query, twitterResults, redditResults })` — formats collected posts into a structured prompt
- Includes per-platform sections with post content, engagement counts, authors
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
2. **Twitter + Reddit analyzed in parallel** via `Promise.allSettled` — if one fails, the other still returns results.
3. **@selanet/sdk used via file dependency** (`"file:../sela-node-v2/client-sdk/crates/sela-node"`) since the package is not published to npm.
4. **Native addon externalized** in `next.config.js` via `serverExternalPackages` + `webpack.externals` to prevent webpack from bundling the `.node` binary.
5. **Activity log passed via HTTP header** (`x-activity-log`) from API route to frontend — truncated to last 10 entries if > 7KB.
6. **localStorage persistence** with key `"sentiment-analyzer-chat"` (changed from `mobile-plan-advisor-chat`).
7. **No API server needed** — agent-node runs with `API_DEV_MODE=true` which bypasses token validation.

## Native Addon + Next.js: How It Was Solved

The `@selanet/sdk` is a **napi-rs native addon** (Rust compiled to `.node` binary). Webpack tries to bundle it and fails because it can't parse binary files. The solution required TWO mechanisms in `next.config.js`:

```js
const nextConfig = {
  // Tell Next.js to not bundle this package for server-side code
  serverExternalPackages: ["@selanet/sdk"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Also explicitly tell webpack to treat it as a commonjs external
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

**Other things tried that did NOT work:**
- `experimental.serverComponentsExternalPackages` — deprecated in Next.js 15, produces a warning and redirects to `serverExternalPackages`
- `serverExternalPackages` alone — did not prevent webpack from traversing into the file-linked package

**If the SDK is rebuilt** (e.g., after switching branches or pulling new code), you must:
```bash
cd /Users/vincent/sela-node-v2/client-sdk/crates/sela-node
pnpm install && pnpm build    # runs: napi build --platform --release
# Then in sentiment-analyzer:
rm -rf node_modules/.cache .next
npm install                    # re-links the file dependency
```

## API Route Decision Logic (`app/api/chat/route.ts`)

The route determines whether to trigger Sela analysis or just chat normally:

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
          → sela_search(twitter, query, 20) ──┐
          → sela_search(reddit, query, 20)  ──┤ Promise.allSettled (parallel)
          ← Collect results                  ──┘
          → buildAnalysisPrompt(query, twitter, reddit)
          → Replace last user message with enriched prompt
          → streamText() to OpenAI with agent system prompt
          → Attach x-activity-log header
          → Return streaming response
```

**Key detail:** The last user message is replaced with the enriched analysis prompt (which contains all the collected post data). Previous messages are preserved for conversation context. This means OpenAI sees the full analysis data, not just the product name.

## Environment Variables

### sentiment-analyzer `.env.local` (current state)
```bash
SELA_SKIP_API_KEY_VALIDATION=true       # Bypass API key format validation in client SDK

OPENAI_API_KEY=sk-your-api-key-here     # NEEDS REAL KEY — not set yet
# OPENAI_MODEL=gpt-4o                  # Optional, defaults to gpt-4o

SELA_API_KEY=sk_live_your-sela-key-here # Placeholder — bypassed by SELA_SKIP_API_KEY_VALIDATION
BOOTSTRAP_PEERS=/dnsaddr/bootstrap.testnet.selanet.ai
```

**Important:** `OPENAI_API_KEY` needs to be set to a real key before the app will work. The Sela key validation is bypassed, so `SELA_API_KEY` can be any value.

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

For local development, authentication is fully bypassed:

| Layer | Mechanism | Effect |
|---|---|---|
| **Client SDK** | `SELA_SKIP_API_KEY_VALIDATION=true` | Accepts any API key format; if no key provided, uses placeholder `"sk_test_connectivity_bypass"` |
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
  count: 20,        // Number of items to collect
  parseOnly: true,  // Skip LLM action planning on agent side
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
# Edit .env.local — at minimum set OPENAI_API_KEY to a real key
# SELA_SKIP_API_KEY_VALIDATION=true is already set

# 3. Ensure the @selanet/sdk native addon is built
# (Already done — the .node file exists at:
#  /Users/vincent/sela-node-v2/client-sdk/crates/sela-node/sela-node.darwin-arm64.node)
# If it needs rebuilding:
cd /Users/vincent/sela-node-v2/client-sdk/crates/sela-node && pnpm install && pnpm build

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

No type errors. No lint errors (warnings were cleaned up).

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
17. **User is currently onboarding** — giving the agent-node access to Twitter/X and Reddit sessions

## What Remains To Do

1. **Set a real `OPENAI_API_KEY`** in `.env.local`
2. **Complete agent-node onboarding** — user needs to grant access to Twitter/X and Reddit logged-in sessions in the Tauri desktop app
3. **Test end-to-end** — `npm run dev`, ask about a product, verify:
   - SelaClient connects to the local agent-node via DHT
   - Twitter search returns results
   - Reddit search returns results
   - OpenAI produces a structured sentiment summary
   - Activity log panel populates
4. **Verify the SDK env var behavior** — the client SDK `.env` has BUILD-TIME vars (`KAD_PROTOCOL`, `BOOTSTRAP_PEERS`) baked into the `.node` binary. Need to confirm that runtime env vars from `sentiment-analyzer/.env.local` properly override these, or if the SDK only uses its compiled-in values.
5. **Handle edge cases:**
   - Rate limiting from platforms
   - Anti-bot detection
   - Empty search results
   - Connection timeouts
   - Agent node not running

## CRITICAL: Build-Time vs Runtime Env Vars in the SDK

**This is the #1 unverified risk.** During `napi build`, the Rust compiler printed these warnings:

```
warning: sela-client@0.1.0: Loading .env from: /Users/vincent/sela-node-v2/client-sdk/.env
warning: sela-client@0.1.0: KAD_PROTOCOL=/selanet-test/kad/1.0.0
warning: sela-client@0.1.0: BOOTSTRAP_PEERS=/dnsaddr/bootstrap.testnet.selanet.ai
warning: sela-client@0.1.0: RELAY_ADDR=/ip4/34.22.104.142/tcp/9001/p2p/12D3KooWA7WYgztSr2BUnfr8huC3KTN9zfWyKx3PJgDPBZKYj2mQ
```

This means the `client-sdk/.env` file was read at **compile time** and some values (likely `KAD_PROTOCOL`) are baked into the binary via Rust's `env!()` macro. This has these implications:

1. **`KAD_PROTOCOL` is almost certainly baked in.** The client and agent MUST use the same Kademlia protocol string to discover each other via DHT. The current baked value is `/selanet-test/kad/1.0.0`, which matches the agent-node's config. If the agent-node switches to a different protocol, the SDK must be **rebuilt**.

2. **`BOOTSTRAP_PEERS` may or may not be overridable at runtime.** The `SelaClient.withApiKey()` factory method might read `BOOTSTRAP_PEERS` from the runtime environment, or it might only use the compiled-in default. The `SelaClientConfig` struct accepts `bootstrapNodes` explicitly, so passing it in code would definitely work — but our `sela-adapter.ts` currently relies on `withApiKey()` which uses defaults.

3. **If the testnet bootstrap/relay IPs change**, the SDK `.node` binary may need to be rebuilt with the updated `client-sdk/.env`.

**To verify:** Run the sentiment analyzer with different `BOOTSTRAP_PEERS` in `.env.local` and check if the client connects to the expected bootstrap node. Check the sela-client Rust source for whether `BOOTSTRAP_PEERS` uses `env!()` (compile-time) or `std::env::var()` (runtime).

## Agent-Node Onboarding Context

The user is currently completing **onboarding** in the Tauri desktop app (`pnpm tauri dev`). This means:
- The agent-node opens a desktop window with a React UI
- The user logs into Twitter/X and Reddit through the embedded browser in this window
- Those authenticated browser sessions become available to the P2P network
- Other clients (like our sentiment analyzer) can then use these sessions to browse those platforms while logged in

**Potential contradiction:** The agent-node `.env` has `AGENT_SKIP_ONBOARDING=true`. This flag may skip an automated onboarding flow but still allow manual session login through the UI. If the user reports that onboarding isn't working, this flag should be checked.

**Another note:** `BROWSER_HEADLESS=true` is set in the agent-node `.env`. If the agent-node needs to render pages visually for the user to log in, headless mode might be a problem. However, the Tauri app likely uses a separate browser context for its UI vs. the headless Chrome for automation. If login-related issues arise, try setting `BROWSER_HEADLESS=false`.

## The `sela_search` Implementation Choice

In `lib/sela-adapter.ts`, searching is done by constructing a search URL and calling `client.browse()`, NOT by calling `client.search()`. The reason:

- `client.browse(url)` navigates to a URL and extracts semantic content from the page via DOM parsing (using platform schemas)
- `client.search(query, targetUrl)` is a higher-level semantic action that may trigger LLM-driven navigation on the agent side

We use `browse()` with manually constructed search URLs because:
1. It's more predictable — we control exactly what URL is visited
2. `parseOnly: true` skips the agent-side LLM, reducing latency and avoiding the need for a Gemini API key on the agent
3. The search URL format for Twitter and Reddit is well-known and stable

If results are poor (e.g., the platform returns different content for direct URL visits vs. in-app searches), consider switching to `client.search()`.

## The `sela_status()` Function

`sela_status()` is defined in the adapter but **not currently used** in the API route. It was originally imported but removed to fix an unused-import warning. It exists for:
- Future health-check endpoint
- Debugging connection issues
- A potential status indicator in the UI

To use it, re-import in the API route or create a separate `/api/sela/status` endpoint.

## The Original Spec Name Mismatch

The user's original spec referred to the project as `mobile-agent-advisor`. The actual directory on disk is `mobile-plan-advisor`. This caused a file-not-found error during initial exploration. If the user references `mobile-agent-advisor` in future instructions, they mean `/Users/vincent/mobile-plan-advisor/`.

## Other Known Concerns

- **Agent node port is dynamic** (`:0` → random port like `65514`). The client discovers it via DHT, so this should be fine, but worth noting.
- **Session delegation status unknown** — user is still onboarding Twitter/Reddit sessions to the agent-node. Until this is complete, browsing those platforms will fail or return unauthenticated content.
- **Activity log via HTTP header** has a size limit. If many searches produce large logs, the header may be truncated. Consider switching to Server-Sent Events or a separate endpoint if this becomes an issue.
- **The `isGreeting()` heuristic is basic** — it checks for common English greetings. A user who types a product name that happens to start with "hey" (e.g., "Hey Jude album") would be misclassified as a greeting. This may need refinement.
- **The `isShortQuery` check** (< 150 chars) is a rough heuristic. Long product descriptions or multi-sentence queries would bypass Sela analysis and go to simple chat mode. This may need adjustment based on real usage.
