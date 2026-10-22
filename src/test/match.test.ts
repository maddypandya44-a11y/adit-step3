import { describe, it, expect } from "vitest";
import { matchResume } from "@/lib/match";

describe("matchResume", () => {
  it("scores the share of job keywords found in the resume", () => {
    const r = matchResume("I build apps with React and TypeScript.", "We need React, TypeScript, AWS and Docker.");
    expect(r.score).toBe(50);
    expect(r.matched).toEqual(["typescript", "react"]);
    expect(r.missing).toEqual(["aws", "docker"]);
  });
  it("returns 0 when the job has no known keywords", () => {
    expect(matchResume("anything", "hello world").score).toBe(0);
  });
});
