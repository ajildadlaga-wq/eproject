// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../i18n/LanguageContext";
import { PriorityBadge, TaskStatusBadge, RiskStatusBadge } from "./Badges";
import { Avatar, ProgressBar } from "./ui";

function withLang(ui: React.ReactElement, lang: "en" | "mn") {
  localStorage.setItem("lang", lang);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

beforeEach(() => localStorage.clear());
afterEach(cleanup); // RTL auto-cleanup needs global afterEach, which we don't enable

describe("PriorityBadge", () => {
  it("renders the English label", () => {
    withLang(<PriorityBadge value="HIGH" />, "en");
    expect(screen.getByText("HIGH")).toBeTruthy();
  });

  it("renders the Mongolian label", () => {
    withLang(<PriorityBadge value="HIGH" />, "mn");
    expect(screen.getByText("ӨНДӨР")).toBeTruthy();
  });

  it("falls back to MEDIUM when value is missing (legacy rows)", () => {
    withLang(<PriorityBadge value={undefined as never} />, "en");
    expect(screen.getByText("MEDIUM")).toBeTruthy();
  });
});

describe("TaskStatusBadge / RiskStatusBadge", () => {
  it("translates task status per language", () => {
    withLang(<TaskStatusBadge value="IN_PROGRESS" />, "mn");
    expect(screen.getByText("Хийгдэж буй")).toBeTruthy();
  });

  it("translates risk status per language", () => {
    withLang(<RiskStatusBadge value="OPEN" />, "en");
    expect(screen.getByText("Open")).toBeTruthy();
  });
});

describe("Avatar", () => {
  it("shows initials from a full name", () => {
    withLang(<Avatar name="Ada Admin" />, "en");
    expect(screen.getByText("AA")).toBeTruthy();
  });

  it("shows ? for a missing name", () => {
    withLang(<Avatar name={null} />, "en");
    expect(screen.getByText("?")).toBeTruthy();
  });
});

describe("ProgressBar", () => {
  it("renders the percentage and clamps the fill width", () => {
    const { container } = withLang(<ProgressBar value={150} />, "en");
    expect(screen.getByText("150%")).toBeTruthy(); // label shows raw value
    const fill = container.querySelector(".bg-violet-500") as HTMLElement;
    expect(fill.style.width).toBe("100%"); // fill is clamped
  });
});
