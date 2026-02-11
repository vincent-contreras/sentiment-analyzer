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
  redditResults: SelaSearchResult;
}

/**
 * Build the user prompt that contains the collected data for OpenAI to analyze.
 */
export function buildAnalysisPrompt(input: SentimentAnalysisInput): string {
  const { query, twitterResults, redditResults } = input;

  const twitterSection = formatPlatformData("Twitter/X", twitterResults);
  const redditSection = formatPlatformData("Reddit", redditResults);

  return `Analyze user sentiment for: "${query}"

## Collected Data

### Twitter/X
${twitterSection}

### Reddit
${redditSection}

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
- All content was accessed via authenticated Sela Network sessions — state this.
- Keep the response concise (no raw quotes, no charts, no tables).`;
}

function formatPlatformData(name: string, result: SelaSearchResult): string {
  if (result.error === "Platform disabled") {
    return `**Status:** Platform not enabled for analysis.\n**Posts collected:** 0`;
  }

  if (result.error) {
    return `**Status:** Failed to access — ${result.error}\n**Posts collected:** 0`;
  }

  if (result.items.length === 0) {
    return `**Status:** Accessed successfully but no results found.\n**Posts collected:** 0`;
  }

  const postSummaries = result.items.map((item, i) => {
    const content = item.fields.content || item.fields.text || item.fields.title || "";
    const likes = item.fields.like_count || item.fields.score || "";
    const author = item.fields.author_name || item.fields.subreddit || "";

    let summary = `${i + 1}. ${String(content).slice(0, 300)}`;
    if (likes) summary += ` [engagement: ${likes}]`;
    if (author) summary += ` [from: ${author}]`;
    return summary;
  });

  return `**Status:** Accessed via authenticated session (${result.authenticated ? "logged in" : "anonymous"})
**Posts collected:** ${result.items.length}

${postSummaries.join("\n")}`;
}
