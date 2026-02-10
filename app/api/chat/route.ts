import { openai } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";
import { getAgentDefinition } from "@/lib/agent";
import {
  sela_search,
  getActivityLog,
  clearActivityLog,
} from "@/lib/sela-adapter";
import { buildAnalysisPrompt } from "@/lib/sentiment-engine";
import type { SelaSearchResult } from "@/lib/sela-adapter";

export const maxDuration = 120; // Allow up to 2 minutes for browsing + analysis

/**
 * POST /api/chat
 *
 * Orchestration flow:
 * 1. Receive user message (product/service to analyze)
 * 2. Check if user is asking about a product (or just chatting)
 * 3. If analysis is needed:
 *    a. Search Twitter + Reddit in parallel via Sela
 *    b. Feed collected posts to OpenAI for sentiment classification
 *    c. Stream the structured response
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
      : JSON.stringify(lastUserMessage.content);

    // Check if this looks like a sentiment query vs general chat
    // The agent prompt instructs to ask "which product/service" first,
    // so on the first message the AI will ask. On subsequent messages,
    // the user provides the product name — that's when we search.
    const isFirstMessage = coreMessages.filter((m) => m.role === "user").length === 1;
    const isShortQuery = userQuery.length < 150;

    // If user just greeted or it's the first exchange, let the LLM handle naturally
    // The agent prompt will make it ask the right question
    if (isFirstMessage && isGreeting(userQuery)) {
      return streamSimpleResponse(modelId, agentDefinition, coreMessages);
    }

    // If there are previous messages and user provides a product/service name, do analysis
    // Also trigger if first message is clearly a product query
    const shouldAnalyze = !isGreeting(userQuery) && isShortQuery;

    if (!shouldAnalyze) {
      return streamSimpleResponse(modelId, agentDefinition, coreMessages);
    }

    // ── Sela-powered analysis flow ─────────────────────────────
    clearActivityLog();

    // Search Twitter and Reddit in parallel
    const [twitterResults, redditResults] = await Promise.allSettled([
      sela_search({ platform: "twitter", query: userQuery, max_results: 20 }),
      sela_search({ platform: "reddit", query: userQuery, max_results: 20 }),
    ]);

    const twitter: SelaSearchResult = twitterResults.status === "fulfilled"
      ? twitterResults.value
      : { platform: "twitter", items: [], authenticated: false, error: twitterResults.reason?.message || "Search failed" };

    const reddit: SelaSearchResult = redditResults.status === "fulfilled"
      ? redditResults.value
      : { platform: "reddit", items: [], authenticated: false, error: redditResults.reason?.message || "Search failed" };

    // Build the analysis prompt with collected data
    const analysisPrompt = buildAnalysisPrompt({
      query: userQuery,
      twitterResults: twitter,
      redditResults: reddit,
    });

    // Prepare activity log for the response header
    const activityLog = getActivityLog();
    const activityLogHeader = JSON.stringify(activityLog);

    // Stream the sentiment analysis from OpenAI
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
 * Simple streaming response without Sela browsing — used for greetings,
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
  const greetings = ["hi", "hello", "hey", "sup", "yo", "howdy", "greetings", "good morning", "good afternoon", "good evening"];
  return greetings.some((g) => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!") || lower.startsWith(g + ","));
}
