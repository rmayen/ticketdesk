import { describe, expect, it } from "vitest";
import { nextStatuses, relativeTime } from "./types";

describe("nextStatuses", () => {
  it("only allows reopening from closed", () => {
    expect(nextStatuses("closed")).toEqual(["open"]);
  });
  it("never offers the current status", () => {
    for (const s of ["open", "in_progress", "resolved", "closed"] as const) {
      expect(nextStatuses(s)).not.toContain(s);
    }
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-10-11T12:00:00Z");
  it("formats seconds, minutes, hours and days", () => {
    expect(relativeTime("2026-10-11T11:59:50Z", now)).toBe("just now");
    expect(relativeTime("2026-10-11T11:45:00Z", now)).toBe("15m ago");
    expect(relativeTime("2026-10-11T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-10-08T12:00:00Z", now)).toBe("3d ago");
  });
});
