/**
 * Normalises text for identity matching: accents stripped, lower-cased, punctuation collapsed.
 * The plan's formula plus one step: NFKD splits "é" into "e" + a combining mark, which the
 * final replace would otherwise turn into a space ("déjà" -> "de ja").
 */
export function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
