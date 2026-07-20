import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, mnCalendarLabel } from "./date";

describe("formatDate", () => {
  const d = "2026-07-03"; // Friday / Баасан

  it("formats Mongolian medium style", () => {
    expect(formatDate(d, "mn")).toBe("2026 оны 7 сарын 3");
  });

  it("formats Mongolian long style with weekday", () => {
    expect(formatDate(d, "mn", "long")).toBe("Баасан, 2026 оны 7 сарын 3");
  });

  it("formats Mongolian short style", () => {
    expect(formatDate(d, "mn", "short")).toBe("7 сарын 3");
  });

  it("formats English medium style", () => {
    expect(formatDate(d, "en")).toBe("Jul 3, 2026");
  });

  it("accepts Date objects", () => {
    expect(formatDate(new Date(2026, 6, 3), "mn")).toBe("2026 оны 7 сарын 3");
  });

  it("returns em-dash for empty input", () => {
    expect(formatDate(null, "en")).toBe("—");
    expect(formatDate(undefined, "mn")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("includes weekday, date and HH:mm in Mongolian", () => {
    const s = formatDateTime("2026-07-01T22:34:00", "mn");
    expect(s).toMatch(/^Лхагва, 2026 оны 7 сарын 1 22:34$/);
  });
});

describe("mnCalendarLabel", () => {
  it("translates month + year labels", () => {
    expect(mnCalendarLabel("August, 2026")).toBe("2026 оны 8-р сар");
    expect(mnCalendarLabel("July, 2026")).toBe("2026 оны 7-р сар");
  });

  it("translates bare month names", () => {
    expect(mnCalendarLabel("June")).toBe("6-р сар");
  });

  it("leaves non-month text alone", () => {
    expect(mnCalendarLabel("W34")).toBeNull();
    expect(mnCalendarLabel("Core development")).toBeNull();
    expect(mnCalendarLabel("2026 оны 8-р сар")).toBeNull(); // already Mongolian
  });
});
