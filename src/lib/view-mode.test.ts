import { describe, expect, it } from "vitest";
import {
  parseSelectedCategories,
  parseSectionStates,
  parseViewModes,
  serialiseSelectedCategories,
  serialiseSectionStates,
  serialiseViewModes,
  toggleSelectedCategory,
  isCategoryShown,
} from "@/lib/view-mode";

describe("view mode cookie", () => {
  it("defaults every section to cards", () => {
    expect(parseViewModes(undefined)).toEqual({
      "to-listen": "cards",
      "set-aside": "cards",
      "recently-listened": "cards",
      following: "cards",
      paused: "cards",
    });
  });

  it("keeps sections independent", () => {
    const modes = parseViewModes("to-listen:list,following:cards");
    expect(modes["to-listen"]).toBe("list");
    expect(modes.following).toBe("cards");
  });

  it("ignores unknown sections and junk values instead of throwing", () => {
    const modes = parseViewModes("nonsense:list,to-listen:sideways,following:list");
    expect(modes["to-listen"]).toBe("cards");
    expect(modes.following).toBe("list");
  });

  it("round-trips", () => {
    const modes = parseViewModes("to-listen:list,paused:list");
    expect(parseViewModes(serialiseViewModes(modes))).toEqual(modes);
  });
});

describe("section state cookie", () => {
  it("defaults to preview so no section grows without bound", () => {
    expect(parseSectionStates(undefined)["to-listen"]).toBe("preview");
  });

  it("stores collapsed and expanded per section", () => {
    const states = parseSectionStates("to-listen:collapsed,following:expanded");
    expect(states["to-listen"]).toBe("collapsed");
    expect(states.following).toBe("expanded");
    expect(states.paused).toBe("preview");
  });

  it("round-trips", () => {
    const states = parseSectionStates("paused:collapsed");
    expect(parseSectionStates(serialiseSectionStates(states))).toEqual(states);
  });
});

describe("queue category filter cookie", () => {
  it("selects nothing by default, which is everything", () => {
    expect(parseSelectedCategories(undefined)).toEqual([]);
  });

  it("retires an earlier filter's values instead of choking on them", () => {
    // "no-singles" and "albums-only" name no category, so a cookie left over
    // from the three-way toggle simply reads as no selection.
    expect(parseSelectedCategories("no-singles")).toEqual([]);
    expect(parseSelectedCategories("albums-only")).toEqual([]);
  });

  it("keeps known categories and drops the rest", () => {
    expect(parseSelectedCategories("single,nonsense,live")).toEqual(["single", "live"]);
  });

  it("round-trips and de-duplicates", () => {
    expect(parseSelectedCategories(serialiseSelectedCategories(["ep", "ep"]))).toEqual([
      "ep",
    ]);
  });

  it("toggles one category without disturbing the others", () => {
    expect(toggleSelectedCategory(["single"], "live")).toEqual(["single", "live"]);
    expect(toggleSelectedCategory(["single", "live"], "single")).toEqual(["live"]);
  });
});

describe("isCategoryShown", () => {
  it("shows everything when nothing is selected", () => {
    expect(isCategoryShown([], "album")).toBe(true);
    expect(isCategoryShown([], "single")).toBe(true);
  });

  it("shows only what is selected", () => {
    // The bug this replaces: pressing "album" used to leave everything but.
    expect(isCategoryShown(["album"], "album")).toBe(true);
    expect(isCategoryShown(["album"], "single")).toBe(false);
  });

  it("allows several at once", () => {
    expect(isCategoryShown(["album", "ep"], "ep")).toBe(true);
    expect(isCategoryShown(["album", "ep"], "live")).toBe(false);
  });
});
