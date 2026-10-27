import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  scoreLevels,
  rawReadiness,
  roundScore,
  verdictFor,
} from "./readiness";

const FIXTURES_PATH = path.resolve(
  __dirname,
  "../../../../../docs/contract/fixtures/talent_check_vectors.json"
);

describe("Cross-Language Test Vectors Parity (TypeScript vs Python)", () => {
  const raw = fs.readFileSync(FIXTURES_PATH, "utf-8");
  const data = JSON.parse(raw);
  const vectors = data.vectors;

  it("loads 200 test vectors", () => {
    expect(vectors.length).toBe(200);
  });

  vectors.forEach((vec: any) => {
    it(`matches vector: ${vec.name}`, () => {
      const res = scoreLevels(vec.candidate, vec.required);
      expect(Math.abs(res.raw - vec.raw)).toBeLessThanOrEqual(0.001);
      expect(res.score).toBe(vec.score);
      expect(res.verdict).toBe(vec.verdict);
      expect(res.blocking).toEqual(vec.blocking);
    });
  });
});
