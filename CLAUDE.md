# CLAUDE.md — Sentiment Analyzer Agent

This file provides full context for any AI continuing work on this project.

## Project Summary

**Sentiment Analyzer** is a local browser-launched AI agent that analyzes high-level user sentiment (positive / neutral / negative / mixed) for a given product or service. It scrapes **Twitter/X profiles** via the **Sela Network REST API** (`https://api.selanetwork.io/api/rpc/scrapeUrl`), then uses OpenAI to classify sentiment.

- **Location:** `/Users/vincent/sentiment-analyzer/`
- **Framework:** Next.js 15, React 19, TypeScript 5.7, Tailwind CSS 3.4
- **LLM Provider:** OpenAI API (`gpt-4o` via `@ai-sdk/openai` + Vercel AI SDK `ai` v4)
- **Data Access:** Sela Network REST API (TWITTER_PROFILE scrapeType)

## Product Requirements (STRICT — do not deviate)

### Core Interaction
The agent MUST start by asking: **"Which product or service do you want to check for user sentiment?"** — only after receiving an answer may analysis proceed.

### Sentiment Scope (FIXED)
- High-level classification ONLY: positive / neutral / negative / mixed
- **No** numeric scores, percentages, or trend charts

### Platforms (STRICT)
- Twitter/X only. No other platforms.

### Data Collection
- Scrapes the product's official Twitter/X profile via Sela API
- Top **20 posts** from the profile, including replies where available
- Twitter handle resolved via a quick OpenAI `generateText()` call

### Compliance & Safety
- Never deanonymize users
- Never quote or expose private content
- Always cite that content was accessed via the Sela Network API
- If content cannot be accessed: explicitly state this in output
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

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Browser (localhost:3000)           │
│  ┌───────────────┐  ┌────────────────────────┐  │
│  │  Chat Panel    │  │  Activity Log Panel    │  │
│  │  User asks:   │  │  - API calls made      │  │
│  │  "sentiment   │  │  - URLs scraped        │  │
│  │   of Cursor?" │  │  - errors               │  │
│  └──────┬────────┘  └────────────────────────┘  │
│         │                                        │
└─────────┼────────────────────────────────────────┘
          │ POST /api/chat (streaming)
          ▼
┌─────────────────────────────────────────────────┐
│         Next.js API Route (route.ts)             │
│                                                  │
│  1. Parse user query (product/service)           │
│  2. Resolve Twitter handle via OpenAI            │
│  3. Scrape profile via Sela REST API             │
│  4. Feed collected posts to OpenAI               │
│  5. Return structured sentiment summary          │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│     Sela Network REST API                        │
│     https://api.selanetwork.io/api/rpc/scrapeUrl │
│                                                  │
│  POST with:                                      │
│    url: "https://x.com/{handle}"                 │
│    scrapeType: "TWITTER_PROFILE"                 │
│  Auth: Bearer token (SELA_API_KEY)               │
└─────────────────────────────────────────────────┘
```

## File Structure

```
sentiment-analyzer/
├── app/
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Home page — renders <Chat/>
│   ├── globals.css                 # Global styles + Tailwind
│   └── api/
│       └── chat/
│           └── route.ts            # API route: orchestrates Sela + OpenAI
├── components/
│   ├── chat.tsx                    # Main chat orchestrator (with activity log)
│   ├── chat-messages.tsx           # Message list with auto-scroll
│   ├── chat-input.tsx              # Auto-resize textarea
│   ├── message.tsx                 # Individual message with markdown
│   ├── sidebar.tsx                 # Conversation sidebar
│   ├── activity-log.tsx            # Sela API activity panel
│   ├── tool-invocation.tsx         # Tool status display
│   ├── sources.tsx                 # URL source links
│   └── icons.tsx                   # SVG icons (Twitter, activity, etc.)
├── lib/
│   ├── sela-adapter.ts             # Sela REST API wrapper (fetch-based)
│   ├── sentiment-engine.ts         # Builds OpenAI analysis prompt from collected posts
│   ├── agent.ts                    # Agent definition loader from AGENT.md
│   ├── types.ts                    # Types
│   └── hooks/
│       └── use-local-storage.ts    # localStorage persistence
├── agents/
│   └── default/
│       └── AGENT.md                # Sentiment analyzer system prompt with all rules
├── .env.example                    # Template for environment variables
├── .env.local                      # Active local config (gitignored)
├── package.json                    # Dependencies
├── next.config.js                  # Next.js config (minimal)
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
- If analysis needed:
  1. Resolves Twitter handle via `generateText()` (quick LLM call)
  2. Calls `sela_search()` with the resolved profile URL
  3. Feeds collected posts to OpenAI via `buildAnalysisPrompt()`
  4. Streams the response back using `streamText()`
- Attaches activity log as `x-activity-log` response header (JSON array)

### `lib/sela-adapter.ts` (Sela Network REST API integration)
- `sela_search({ profileUrl, query, max_results })` — calls `POST /api/rpc/scrapeUrl` with `scrapeType: "TWITTER_PROFILE"`
- Auth via `Authorization: Bearer ${SELA_API_KEY}`
- `parseTwitterProfileResult(data)` — maps API response into `SelaContentItem[]`
- Activity log array exposed via `getActivityLog()` / `clearActivityLog()`
- Config: `SELA_API_BASE_URL` env var (defaults to `https://api.selanetwork.io`)

### `lib/sentiment-engine.ts` (Prompt construction)
- `buildAnalysisPrompt({ query, twitterResults })` — formats collected posts into a structured prompt
- Instructs OpenAI to produce the required 3-section output format
- Enforces rules: no user deanonymization, no raw quotes, no guessing

### `agents/default/AGENT.md` (System prompt)
- Loaded server-side by `lib/agent.ts` and injected as system message
- Defines the agent's role, interaction flow, output format, rules, and prohibited actions

## Environment Variables

### `.env.local` (current state)
```bash
OPENAI_API_KEY=sk-proj-...              # Real key — SET AND WORKING
# OPENAI_MODEL=gpt-4o                  # Optional, defaults to gpt-4o

SELA_API_KEY=...                        # Sela Network REST API key
# SELA_API_BASE_URL=https://api.selanetwork.io  # Optional, defaults to this
```

## Build & Run

```bash
# 1. Install dependencies
cd /Users/vincent/sentiment-analyzer
npm install

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local — set OPENAI_API_KEY and SELA_API_KEY

# 3. Start the sentiment analyzer
npm run dev
# Opens at http://localhost:3000
```

No agent node, no P2P network, no native addons needed — just API keys.

## API Route Decision Logic

```
User message received
    │
    ├─ No user message found?  → Stream simple response
    │
    ├─ First message AND is a greeting?
    │     → Stream simple response (agent will ask "which product?")
    │
    ├─ Is a greeting OR message > 150 chars?
    │     → Stream simple response
    │
    └─ Short, non-greeting message (likely a product/service name)
          → Clear activity log
          → resolveTwitterProfileUrl(query) via OpenAI
          → sela_search(profileUrl, query, 20)
          → buildAnalysisPrompt(query, twitterResults)
          → streamText() to OpenAI with agent system prompt
          → Attach x-activity-log header
          → Return streaming response
```

## Twitter Handle Resolution

The user provides a product name (e.g. "Cursor"), but the Sela API needs a profile URL (e.g. `https://x.com/cursor_ai`). The route uses a quick `generateText()` call to ask OpenAI for the official Twitter handle, then validates the response (alphanumeric + underscore, max 15 chars). Fallback: sanitize the product name as a handle.

## Design Decisions

1. **OpenAI API** chosen as LLM provider (not Claude). Env var: `OPENAI_API_KEY`. Default model: `gpt-4o`.
2. **Sela REST API** replaces the previous P2P SDK. Simple `fetch()` calls, no native addons.
3. **TWITTER_PROFILE scrapeType** — scrapes a product's official Twitter profile (posts + replies) rather than search results.
4. **LLM handle resolution** — quick `generateText()` call to infer the Twitter handle from a product name. Avoids needing a second scrape type (GOOGLE_SEARCH).
5. **Activity log passed via HTTP header** (`x-activity-log`) from API route to frontend — truncated to last 10 entries if > 7KB.
6. **localStorage persistence** with key `"sentiment-analyzer-chat"`.
