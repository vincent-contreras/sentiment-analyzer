# Sentiment Analyzer

AI-powered agent that analyzes public user sentiment for any product or service using real Twitter/X data, accessed through the Sela Network API.

## How It Works

1. You ask about a product or service (e.g. "Cursor", "Notion", "ChatGPT")
2. The agent infers the product's official Twitter/X handle using OpenAI
3. It scrapes the Twitter/X profile via the Sela Network REST API
4. It feeds collected posts and replies to OpenAI for analysis
5. You get a structured sentiment summary: **positive**, **negative**, **neutral**, or **mixed** — with supporting reasoning

The agent only **reads** public posts. It never posts, likes, replies, or interacts on any platform.

## Example Output

> ### 1) Sentiment Summary
> - **Overall sentiment:** positive
> - Users widely praise the product's speed and responsiveness
> - Multiple posts highlight recent improvements to the editing experience
> - Some frustration around pricing changes, but outweighed by positive reception
> - Community engagement is active with constructive feedback
>
> ### 2) Coverage Notes
> - Platforms successfully analyzed: Twitter/X
> - Content accessed via the Sela Network API
>
> ### 3) Confidence & Unknowns
> - Based on recent posts from the product's Twitter/X profile
> - Sentiment is consistent across most posts, lending moderate confidence

## Architecture

```
Browser (localhost:3000)
    |
    |  Chat UI with real-time activity log
    |
    v
Next.js API Route (/api/chat)
    |
    |-- Resolves Twitter handle via OpenAI
    |-- Scrapes Twitter/X profile via Sela Network REST API
    '-- Streams structured sentiment analysis from OpenAI
            |
            v
      Sela Network API (api.selanetwork.io)
      Scrapes Twitter/X profiles using TWITTER_PROFILE scrapeType
```

## Prerequisites

- **Node.js** >= 18
- **OpenAI API key** — get one at https://platform.openai.com/api-keys
- **Sela Network API key** — for accessing the Sela scraping API

## Quick Start

```bash
# Clone the repository
git clone https://github.com/vincent-contreras/sentiment-analyzer.git
cd sentiment-analyzer

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
```

Edit `.env.local` with your keys:

```bash
# Required — OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Required — Sela Network API
SELA_API_KEY=your-sela-api-key
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and ask about any product or service.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key for sentiment analysis |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model to use |
| `SELA_API_KEY` | Yes | — | API key for the Sela Network REST API |
| `SELA_API_BASE_URL` | No | `https://api.selanetwork.io` | Sela API base URL |

## Project Structure

```
sentiment-analyzer/
├── app/
│   ├── api/chat/route.ts        # API route — orchestrates handle resolution + Sela scrape + OpenAI analysis
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── components/
│   ├── chat.tsx                 # Main chat UI with activity log integration
│   ├── chat-messages.tsx        # Message list with auto-scroll
│   ├── chat-input.tsx           # Auto-resizing input textarea
│   ├── message.tsx              # Individual message with markdown rendering
│   ├── activity-log.tsx         # Real-time Sela API activity panel
│   ├── sidebar.tsx              # Conversation history sidebar
│   └── icons.tsx                # SVG icons (Twitter, activity, etc.)
├── lib/
│   ├── sela-adapter.ts          # Sela REST API wrapper — scrapeUrl with TWITTER_PROFILE
│   ├── sentiment-engine.ts      # Builds the analysis prompt from collected posts
│   ├── agent.ts                 # Loads the agent system prompt
│   ├── types.ts                 # Shared TypeScript types
│   └── hooks/
│       └── use-local-storage.ts # Conversation persistence
├── agents/default/AGENT.md      # Agent system prompt defining behavior and rules
├── .env.example                 # Environment variable template
└── next.config.js               # Next.js config
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS 3.4
- **LLM:** OpenAI (gpt-4o) via Vercel AI SDK
- **Data Access:** Sela Network REST API

## Privacy & Safety

- Read-only access — never posts, likes, replies, votes, or sends messages
- Never deanonymizes users or exposes usernames
- Never quotes private content or accesses non-public data
- All platform access goes through the Sela Network API, clearly disclosed in output
- If data can't be accessed (rate limits, login failure, anti-bot detection), the agent states the limitation explicitly
- If sentiment is unclear, the agent outputs "Sentiment is mixed or inconclusive" rather than guessing

## Development

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```
