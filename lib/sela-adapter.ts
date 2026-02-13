/**
 * Sela Network adapter — calls the Sela REST API for Twitter profile scraping.
 *
 * Responsibilities:
 * - POST to /api/rpc/scrapeUrl with TWITTER_PROFILE scrapeType
 * - Parse API response into SelaContentItem[]
 * - Activity log collection for the UI
 */

import type { ActivityLogEntry } from "./types";
import { v4 as uuidv4 } from "uuid";

// ── Types ────────────────────────────────────────────────────────

export interface SelaSearchResult {
  platform: "twitter";
  items: SelaContentItem[];
  authenticated: boolean;
  error?: string;
}

export interface SelaContentItem {
  contentType: string;
  fields: Record<string, unknown>;
  url?: string;
}

// ── Config ───────────────────────────────────────────────────────

const SELA_API_BASE_URL =
  process.env.SELA_API_BASE_URL || "https://api.selanetwork.io";

// ── Activity log ─────────────────────────────────────────────────

let activityLog: ActivityLogEntry[] = [];

function log(
  type: ActivityLogEntry["type"],
  platform: ActivityLogEntry["platform"],
  message: string,
  url?: string,
  details?: string
) {
  const entry: ActivityLogEntry = {
    id: uuidv4(),
    timestamp: new Date(),
    type,
    platform,
    message,
    url,
    details,
  };
  activityLog.push(entry);
  return entry;
}

export function getActivityLog(): ActivityLogEntry[] {
  return [...activityLog];
}

export function clearActivityLog(): void {
  activityLog = [];
}

// ── API call ─────────────────────────────────────────────────────

/**
 * Scrape a Twitter profile via the Sela Network REST API.
 *
 * @param profileUrl - Full Twitter/X profile URL (e.g. https://x.com/cursor_ai)
 * @param query - The original user query (for logging)
 * @param max_results - Max items to return (default 20)
 */
export async function sela_search(params: {
  profileUrl: string;
  query: string;
  max_results?: number;
}): Promise<SelaSearchResult> {
  const { profileUrl, query, max_results = 20 } = params;

  const apiKey = process.env.SELA_API_KEY;
  if (!apiKey) {
    log("error", "system", "SELA_API_KEY environment variable is not set");
    return {
      platform: "twitter",
      items: [],
      authenticated: false,
      error: "SELA_API_KEY not configured",
    };
  }

  try {
    log("search", "twitter", `Scraping Twitter profile for "${query}"`, profileUrl);

    const response = await fetch(`${SELA_API_BASE_URL}/api/rpc/scrapeUrl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: profileUrl,
        scrapeType: "TWITTER_PROFILE",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      const errorMsg = `Sela API returned ${response.status}: ${errorText}`;
      log("error", "twitter", errorMsg, profileUrl);
      return {
        platform: "twitter",
        items: [],
        authenticated: false,
        error: errorMsg,
      };
    }

    const json = await response.json();
    // API returns { success, data: { result: [...] } }
    const data = (json.data || json) as Record<string, unknown>;
    const items = parseTwitterProfileResult(data, max_results);

    log(
      "info",
      "twitter",
      `Found ${items.length} results for "${query}"`,
      profileUrl,
      `API response status: ${response.status}`
    );

    return {
      platform: "twitter",
      items,
      authenticated: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log("error", "twitter", `Scrape failed: ${errorMsg}`, profileUrl, query);

    return {
      platform: "twitter",
      items: [],
      authenticated: false,
      error: errorMsg,
    };
  }
}

// ── Response parser ──────────────────────────────────────────────

/**
 * Parse the Sela API response into SelaContentItem[].
 *
 * The API returns { result: { ... } } — the exact shape may vary,
 * so we handle multiple formats defensively.
 */
function parseTwitterProfileResult(
  data: Record<string, unknown>,
  maxResults: number
): SelaContentItem[] {
  const items: SelaContentItem[] = [];

  try {
    // The API response structure: { result: { data: [...] } } or { result: [...] }
    const result = data.result as Record<string, unknown> | unknown[] | undefined;
    if (!result) return items;

    let entries: unknown[];
    if (Array.isArray(result)) {
      entries = result;
    } else if (Array.isArray(result.data)) {
      entries = result.data;
    } else if (Array.isArray(result.tweets)) {
      entries = result.tweets;
    } else if (Array.isArray(result.posts)) {
      entries = result.posts;
    } else if (Array.isArray(result.items)) {
      entries = result.items;
    } else {
      // Single result object — wrap it
      entries = [result];
    }

    for (const entry of entries.slice(0, maxResults)) {
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        // Build full tweet URL from relative tweetUrl field
        const tweetUrl = record.tweetUrl
          ? `https://x.com${record.tweetUrl}`
          : (record.url as string) || undefined;
        items.push({
          contentType: "tweet",
          fields: record,
          url: tweetUrl,
        });
      }
    }
  } catch {
    // If parsing fails completely, return empty
  }

  return items;
}
