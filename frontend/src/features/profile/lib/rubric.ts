// Shared evidence -> level rubric (contract section 2). Drives the slider helper text.
import { BLOOM_NAMES, bloomOf, type Bloom } from "@/lib/categories";

export interface Band {
  bloom: Bloom;
  name: string;
  min: number;
  max: number;
  /** What a candidate's evidence looks like at this band. */
  evidence: string;
}

export const BANDS: Band[] = [
  {
    bloom: "CU",
    name: BLOOM_NAMES.CU,
    min: 1,
    max: 2,
    evidence: "Listed in skills or coursework, or you are 'familiar with' it.",
  },
  {
    bloom: "AP",
    name: BLOOM_NAMES.AP,
    min: 3,
    max: 4,
    evidence: "Used it in one academic or personal project or lab.",
  },
  {
    bloom: "AS",
    name: BLOOM_NAMES.AS,
    min: 5,
    max: 6,
    evidence:
      "Several projects or an internship using it; debugging, optimising, measurable results.",
  },
  {
    bloom: "EV",
    name: BLOOM_NAMES.EV,
    min: 7,
    max: 8,
    evidence:
      "Led or designed it, used it in production, ranked at the top, or reviewed others' work.",
  },
  {
    bloom: "CR",
    name: BLOOM_NAMES.CR,
    min: 9,
    max: 10,
    evidence: "Built something new: published research, maintained open source, a novel system.",
  },
];

export const RUBRIC: Record<number, Band> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [i + 1, BANDS[Math.floor(i / 2)] as Band]),
);

export const bandOf = (level: number): Band => RUBRIC[Math.min(10, Math.max(1, level))] as Band;

/** `aria-valuetext` for the slider, e.g. "Level 6, Analysis and Synthesis". */
export const levelText = (level: number): string =>
  `Level ${level}, ${BLOOM_NAMES[bloomOf(level)]}`;
