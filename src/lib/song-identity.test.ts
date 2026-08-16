import { describe, expect, it } from "vitest";
import { songKey } from "@/lib/song-identity";

const same = (a: string, b: string) => songKey(a) === songKey(b);

describe("songKey — folds repackagings of the same performance", () => {
  it("matches a plain title to its remaster", () => {
    expect(same("Karma Police", "Karma Police (Remastered 2011)")).toBe(true);
    expect(same("Karma Police", "Karma Police - 2011 Remaster")).toBe(true);
    expect(same("Karma Police", "Karma Police [Remastered]")).toBe(true);
  });

  it("matches across deluxe, expanded and anniversary editions", () => {
    expect(same("No Surprises", "No Surprises (Deluxe Edition)")).toBe(true);
    expect(same("No Surprises", "No Surprises (Bonus Track)")).toBe(true);
    expect(same("No Surprises", "No Surprises (20th Anniversary)")).toBe(true);
  });

  it("ignores featured-artist credits, which differ between single and album", () => {
    expect(same("Bad Habit", "Bad Habit (feat. Someone)")).toBe(true);
    expect(same("Bad Habit", "Bad Habit ft. Someone")).toBe(true);
    expect(same("Bad Habit", "Bad Habit (with Someone)")).toBe(true);
  });

  it("ignores punctuation, case and accents", () => {
    expect(same("Everything In Its Right Place", "everything in its right place")).toBe(
      true,
    );
    expect(same("Déjà Vu", "Deja Vu")).toBe(true);
    expect(same("Stop!", "Stop")).toBe(true);
  });
});

describe("songKey — keeps genuinely different performances apart", () => {
  it("treats a live take as its own song", () => {
    expect(same("Creep", "Creep (Live)")).toBe(false);
    expect(same("Creep", "Creep - Live at Glastonbury")).toBe(false);
  });

  it("treats acoustic, demo, remix and instrumental as their own songs", () => {
    for (const variant of [
      "Creep (Acoustic)",
      "Creep (Demo)",
      "Creep (Some Remix)",
      "Creep (Instrumental)",
      "Creep (Radio Edit)",
    ]) {
      expect(same("Creep", variant)).toBe(false);
    }
  });

  it("keeps different songs apart", () => {
    expect(same("Creep", "Bones")).toBe(false);
  });
});

describe("songKey — degenerate input", () => {
  it("never produces an empty key, which would fold unrelated tracks together", () => {
    expect(songKey("...")).not.toBe("");
    expect(songKey("!!!")).not.toBe("");
    expect(songKey("...")).not.toBe(songKey("!!!"));
  });

  it("is stable across repeated calls", () => {
    expect(songKey("Karma Police (Remastered)")).toBe(
      songKey("Karma Police (Remastered)"),
    );
  });

  it("does not fold two different songs that merely share a qualifier", () => {
    expect(same("One (Remastered)", "Two (Remastered)")).toBe(false);
  });
});
