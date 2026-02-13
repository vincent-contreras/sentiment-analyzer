import { openai } from "@ai-sdk/openai";
import { streamText, generateText, type CoreMessage } from "ai";
import { getAgentDefinition } from "@/lib/agent";
import {
  sela_search,
  getActivityLog,
  clearActivityLog,
} from "@/lib/sela-adapter";
import { buildAnalysisPrompt } from "@/lib/sentiment-engine";

export const maxDuration = 120; // Allow up to 2 minutes for scraping + analysis

/**
 * POST /api/chat
 *
 * Orchestration flow:
 * 1. Receive user message (product/service to analyze)
 * 2. Check if user is asking about a product (or just chatting)
 * 3. If analysis is needed:
 *    a. Use LLM to infer the Twitter handle for the product
 *    b. Scrape the Twitter profile via Sela Network API
 *    c. Feed collected posts to OpenAI for sentiment classification
 *    d. Stream the structured response
 * 4. Attach activity log in response header
 */
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const agentDefinition = await getAgentDefinition();
    const modelId = process.env.OPENAI_MODEL || "gpt-4o";

    const coreMessages = messages as CoreMessage[];

    // Get the latest user message to determine if we need to do analysis
    const lastUserMessage = [...coreMessages]
      .reverse()
      .find((m) => m.role === "user");

    if (!lastUserMessage) {
      return streamSimpleResponse(modelId, agentDefinition, coreMessages);
    }

    const userQuery = typeof lastUserMessage.content === "string"
      ? lastUserMessage.content
      : Array.isArray(lastUserMessage.content)
        ? lastUserMessage.content
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join(" ")
        : String(lastUserMessage.content);

    // Check if this looks like a sentiment query vs general chat
    const isFirstMessage = coreMessages.filter((m) => m.role === "user").length === 1;
    const isShortQuery = userQuery.length < 150;

    // If user just greeted or it's the first exchange, let the LLM handle naturally
    if (isFirstMessage && isGreeting(userQuery)) {
      return streamSimpleResponse(modelId, agentDefinition, coreMessages);
    }

    // If there are previous messages and user provides a product/service name, do analysis
    const shouldAnalyze = !isGreeting(userQuery) && isShortQuery;

    if (!shouldAnalyze) {
      return streamSimpleResponse(modelId, agentDefinition, coreMessages);
    }

    // ── Sela-powered analysis flow ─────────────────────────────
    clearActivityLog();

    // Step 1: Use LLM to infer the Twitter handle for the product
    const profileUrl = await resolveTwitterProfileUrl(userQuery, modelId);

    // Step 2: Scrape the Twitter profile via Sela API
    const twitterResults = await sela_search({
      profileUrl,
      query: userQuery,
      max_results: 20,
    });

    // Step 3: Build the analysis prompt with collected data
    const analysisPrompt = buildAnalysisPrompt({
      query: userQuery,
      twitterResults,
    });

    // Prepare activity log for the response header
    const activityLog = getActivityLog();
    const activityLogHeader = JSON.stringify(activityLog);

    // Step 4: Stream the sentiment analysis from OpenAI
    const result = streamText({
      model: openai(modelId),
      system: agentDefinition,
      messages: [
        ...coreMessages.slice(0, -1), // Previous conversation context
        { role: "user" as const, content: analysisPrompt }, // Replace last user msg with enriched prompt
      ],
    });

    const response = result.toDataStreamResponse();

    // Attach activity log as custom header
    const headers = new Headers(response.headers);
    // Truncate if too large for a header (max ~8KB)
    const truncatedLog = activityLogHeader.length > 7000
      ? JSON.stringify(activityLog.slice(-10))
      : activityLogHeader;
    headers.set("x-activity-log", truncatedLog);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key not configured" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      if (error.message.includes("SELA_API_KEY")) {
        return new Response(
          JSON.stringify({ error: "Sela API key not configured" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Use a quick LLM call to infer the Twitter/X handle for a product or service.
 * Falls back to sanitizing the product name as a handle if generation fails.
 */
async function resolveTwitterProfileUrl(
  productName: string,
  modelId: string
): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai(modelId),
      prompt: `What is the official Twitter/X handle for "${productName}"? Reply with ONLY the handle (e.g. @cursor_ai), nothing else. If you're not sure, give your best guess.`,
      maxTokens: 30,
    });

    const handle = text.trim().replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "");
    if (handle.length > 0 && handle.length <= 15) {
      return `https://x.com/${handle}`;
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: sanitize the product name as a handle
  const fallbackHandle = productName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 15);
  return `https://x.com/${fallbackHandle}`;
}

/**
 * Simple streaming response without Sela scraping — used for greetings,
 * clarification questions, and when the agent needs to ask for the product name.
 */
function streamSimpleResponse(
  modelId: string,
  agentDefinition: string,
  messages: CoreMessage[]
) {
  const result = streamText({
    model: openai(modelId),
    system: agentDefinition,
    messages,
  });

  return result.toDataStreamResponse();
}

/**
 * Basic heuristic: is this a greeting or very short generic message?
 */
function isGreeting(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const exactGreetings = ["hi", "hello", "hey", "sup", "yo", "howdy", "greetings", "good morning", "good afternoon", "good evening"];
  // Only match exact greetings or greetings followed by punctuation/filler
  // e.g. "hey!" or "hello there" but NOT "Hey Siri" (a product query)
  const greetingFollowUps = ["there", "bot", "agent", "buddy", "friend", "everyone", "all"];
  if (exactGreetings.includes(lower)) return true;
  for (const g of exactGreetings) {
    if (lower.startsWith(g + "!") || lower.startsWith(g + ",") || lower.startsWith(g + ".")) return true;
    for (const f of greetingFollowUps) {
      if (lower === `${g} ${f}` || lower.startsWith(`${g} ${f}!`) || lower.startsWith(`${g} ${f},`)) return true;
    }
  }
  return false;
}
