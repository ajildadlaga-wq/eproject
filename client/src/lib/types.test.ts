import { describe, it, expect } from "vitest";
import { weightedProgress, PRIORITY_WEIGHT } from "./types";

describe("weightedProgress", () => {
  it("returns 0 for no tasks", () => {
    expect(weightedProgress([])).toBe(0);
  });

  it("equals the simple average when priorities are equal", () => {
    const tasks = [
      { percent_complete: 100, priority: "MEDIUM" as const },
      { percent_complete: 0, priority: "MEDIUM" as const },
    ];
    expect(weightedProgress(tasks)).toBe(50);
  });

  it("weights high-priority tasks more heavily", () => {
    // HIGH=3, LOW=1. A finished HIGH task should dominate an unfinished LOW one.
    const tasks = [
      { percent_complete: 100, priority: "HIGH" as const },
      { percent_complete: 0, priority: "LOW" as const },
    ];
    // (3*100 + 1*0) / (3+1) = 75
    expect(weightedProgress(tasks)).toBe(75);
  });

  it("treats CRITICAL and HIGH with the same weight", () => {
    expect(PRIORITY_WEIGHT.CRITICAL).toBe(PRIORITY_WEIGHT.HIGH);
  });
});
