import { describe, expect, it } from "vitest";
import {
  parseHiddenCategories,
  parseSectionStates,
  parseViewModes,
  serialiseHiddenCategories,
  serialiseSectionStates,
  serialiseViewModes,
  toggleHiddenCategory,
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
  it("hides nothing by default", () => {
    expect(parseHiddenCategories(undefined)).toEqual([]);
  });

  it("retires the previous filter's values instead of choking on them", () => {
    // "no-singles" and "albums-only" name no category, so an old cookie left
    // over from the three-way toggle simply reads as nothing hidden.
    expect(parseHiddenCategories("no-singles")).toEqual([]);
    expect(parseHiddenCategories("albums-only")).toEqual([]);
  });

  it("keeps known categories and drops the rest", () => {
    expect(parseHiddenCategories("single,nonsense,live")).toEqual(["single", "live"]);
  });

  it("round-trips and de-duplicates", () => {
    expect(parseHiddenCategories(serialiseHiddenCategories(["ep", "ep"]))).toEqual([
      "ep",
    ]);
  });

  it("toggles one category without disturbing the others", () => {
    expect(toggleHiddenCategory(["single"], "live")).toEqual(["single", "live"]);
    expect(toggleHiddenCategory(["single", "live"], "single")).toEqual(["live"]);
  });
});
