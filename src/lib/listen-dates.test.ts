import { describe, expect, it } from "vitest";
import { UNDO_WINDOW_MS, isUndoingUnheard, listenedAtOnMarking } from "@/lib/listen-dates";

const now = new Date("2026-08-18T12:00:00Z");
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000);

describe("isUndoingUnheard", () => {
  it("is false when it was never un-ticked", () => {
    expect(isUndoingUnheard({ unheardAt: null }, now)).toBe(false);
  });

  it("is true just after an un-tick", () => {
    expect(isUndoingUnheard({ unheardAt: minutesAgo(1) }, now)).toBe(true);
  });

  it("is false once the window has passed", () => {
    expect(isUndoingUnheard({ unheardAt: minutesAgo(61) }, now)).toBe(false);
  });

  it("counts the boundary itself as undoing", () => {
    const boundary = new Date(now.getTime() - UNDO_WINDOW_MS);
    expect(isUndoingUnheard({ unheardAt: boundary }, now)).toBe(true);
  });

  it("treats a clock that ran backwards as recent, not as forever ago", () => {
    expect(isUndoingUnheard({ unheardAt: new Date(now.getTime() + 5_000) }, now)).toBe(true);
  });
});

describe("listenedAtOnMarking", () => {
  it("dates a first listen", () => {
    expect(listenedAtOnMarking({ listenedAt: null, unheardAt: null }, now)).toEqual(now);
  });

  it("keeps an imported record undated when a mistap is undone", () => {
    // The case that caused the bug: heard, no date, un-ticked and re-ticked.
    const restored = listenedAtOnMarking(
      { listenedAt: null, unheardAt: minutesAgo(1) },
      now,
    );
    expect(restored).toBeNull();
  });

  it("puts the original date back when a mistap is undone", () => {
    const original = new Date("2020-03-04T00:00:00Z");
    const restored = listenedAtOnMarking(
      { listenedAt: original, unheardAt: minutesAgo(2) },
      now,
    );
    expect(restored).toEqual(original);
  });

  it("dates a genuine listen after a deliberate un-tick", () => {
    const original = new Date("2020-03-04T00:00:00Z");
    expect(
      listenedAtOnMarking({ listenedAt: original, unheardAt: minutesAgo(60 * 24) }, now),
    ).toEqual(now);
  });

  it("dates a genuine listen of something imported and never dated", () => {
    expect(
      listenedAtOnMarking({ listenedAt: null, unheardAt: minutesAgo(60 * 24) }, now),
    ).toEqual(now);
  });
});
