/**
 * Sentiment analysis engine — takes collected posts and produces a structured summary.
 *
 * Uses OpenAI to classify sentiment and generate the required output format:
 *   1) Sentiment Summary (label + bullet points)
 *   2) Coverage Notes (platforms analyzed, limitations)
 *   3) Confidence & Unknowns
 */

import type { SelaSearchResult } from "./sela-adapter";

export interface SentimentAnalysisInput {
  query: string;
  twitterResults: SelaSearchResult;
}

/**
 * Build the user prompt that contains the collected data for OpenAI to analyze.
 */
export function buildAnalysisPrompt(input: SentimentAnalysisInput): string {
  const { query, twitterResults } = input;

  const twitterSection = formatPlatformData("Twitter/X", twitterResults);

  return `Analyze user sentiment for: "${query}"

## Collected Data

### Twitter/X Profile Posts and Replies
${twitterSection}

## Instructions
Based ONLY on the data above, provide a sentiment analysis following this EXACT structure:

### 1) Sentiment Summary
- **Overall sentiment:** [positive / neutral / negative / mixed]
- Bullet point 1 explaining why
- Bullet point 2 explaining why
- (Optional) Bullet point 3
- (Optional) Bullet point 4

### 2) Coverage Notes
- Platforms successfully analyzed: [list]
- Access limitations or missing data: [describe any issues]

### 3) Confidence & Unknowns
- Why this conclusion is reliable or uncertain

RULES:
- Do NOT quote individual users or expose usernames.
- Do NOT invent or infer beyond what is observed.
- If sentiment is unclear, state "Sentiment is mixed or inconclusive."
- All content was accessed via the Sela Network API — state this.
- Keep the response concise (no raw quotes, no charts, no tables).`;
}

function formatPlatformData(name: string, result: SelaSearchResult): string {
  if (result.error) {
    return `**Status:** Failed to access — ${result.error}\n**Posts collected:** 0`;
  }

  if (result.items.length === 0) {
    return `**Status:** Accessed successfully but no results found.\n**Posts collected:** 0`;
  }

  const postSummaries = result.items.map((item, i) => {
    const content = item.fields.content || item.fields.text || item.fields.title || "";
    const likes = item.fields.likesCount || item.fields.like_count || "";
    const replies = item.fields.repliesCount || "";
    const retweets = item.fields.retweetsCount || "";

    let summary = `${i + 1}. ${String(content).slice(0, 300)}`;
    const engagementParts: string[] = [];
    if (likes) engagementParts.push(`${likes} likes`);
    if (retweets) engagementParts.push(`${retweets} retweets`);
    if (replies) engagementParts.push(`${replies} replies`);
    if (engagementParts.length > 0) summary += ` [${engagementParts.join(", ")}]`;
    return summary;
  });

  return `**Status:** Accessed via Sela Network API (${result.authenticated ? "authenticated" : "anonymous"})
**Posts collected:** ${result.items.length}

${postSummaries.join("\n")}`;
}
