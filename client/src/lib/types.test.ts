import { describe, it, expect } from "vitest";
import { weightedProgress, PRIORITY_WEIGHT } from "./types";

describe("weightedProgress", () => {
  it("returns 0 for no tasks", () => {
    expect(weightedProgress([])).toBe(0);
  });

  it("equals the simple average when priorities are equal", () => {
    const tasks = [
      { status: "APPROVED" as const, priority: "MEDIUM" as const },
      { status: "ASSIGNED" as const, priority: "MEDIUM" as const },
    ];
    expect(weightedProgress(tasks)).toBe(50);
  });

  it("weights high-priority tasks more heavily", () => {
    // HIGH=3, LOW=1. An approved HIGH task should dominate an open LOW one.
    const tasks = [
      { status: "APPROVED" as const, priority: "HIGH" as const },
      { status: "ASSIGNED" as const, priority: "LOW" as const },
    ];
    // (3*100 + 1*0) / (3+1) = 75
    expect(weightedProgress(tasks)).toBe(75);
  });

  it("counts approved work only", () => {
    // The assignee has finished all three and two are waiting on the manager.
    // Until they are approved they are worth nothing — this is the rule the
    // whole approval workflow exists to enforce.
    const tasks = [
      { status: "COMPLETED" as const, priority: "MEDIUM" as const },
      { status: "UNDER_REVIEW" as const, priority: "MEDIUM" as const },
      { status: "APPROVED" as const, priority: "MEDIUM" as const },
    ];
    expect(weightedProgress(tasks)).toBe(33);
  });

  it("gives no credit for work sent back", () => {
    const tasks = [
      { status: "REJECTED" as const, priority: "HIGH" as const },
      { status: "IN_PROGRESS" as const, priority: "HIGH" as const },
    ];
    expect(weightedProgress(tasks)).toBe(0);
  });

  it("treats CRITICAL and HIGH with the same weight", () => {
    expect(PRIORITY_WEIGHT.CRITICAL).toBe(PRIORITY_WEIGHT.HIGH);
  });
});
