/**
 * textClean.ts
 * Clean UTF-8 encoding artifacts (mojibake) from database strings.
 */

const REPLACEMENTS: Record<string, string> = {
  "Ã¢â‚¬â€œ": "–",
  "Ã¢â‚¬â„¢": "'",
  "Ã¢â‚¬Å“": '"',
  "Ã¢â‚¬Â": '"',
  "â€“": "–",
  "â€”": "—",
  "â€™": "'",
  "â€œ": '"',
  "â€": '"',
};

export function cleanTopicText(s: string): string {
  if (!s) return "";
  let cleaned = s;
  for (const [bad, good] of Object.entries(REPLACEMENTS)) {
    cleaned = cleaned.replaceAll(bad, good);
  }
  return cleaned.trim();
}
