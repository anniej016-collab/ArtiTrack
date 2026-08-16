import { describe, expect, it } from "vitest";
import { parseDiscoveryLines } from "@/lib/discovery";

describe("parseDiscoveryLines", () => {
  it("splits an artist from a title on the usual dashes", () => {
    expect(
      parseDiscoveryLines("Sampha - Spirit 2.0\nYaya Bey – Karma\nNala Sinephro — Space 1"),
    ).toEqual([
      { artistName: "Sampha", title: "Spirit 2.0" },
      { artistName: "Yaya Bey", title: "Karma" },
      { artistName: "Nala Sinephro", title: "Space 1" },
    ]);
  });

  it("treats a bare line as an artist worth hearing", () => {
    expect(parseDiscoveryLines("Nala Sinephro")).toEqual([
      { artistName: "Nala Sinephro", title: null },
    ]);
  });

  it("keeps a hyphenated name intact", () => {
    // The separator needs spaces around it, so "Jean-Michel" survives.
    expect(parseDiscoveryLines("Jean-Michel Jarre - Oxygène")).toEqual([
      { artistName: "Jean-Michel Jarre", title: "Oxygène" },
    ]);
  });

  it("keeps a dash inside the title", () => {
    expect(parseDiscoveryLines("Artist - Song - Live Version")).toEqual([
      { artistName: "Artist", title: "Song - Live Version" },
    ]);
  });

  it("strips list numbering and trailing running times", () => {
    expect(parseDiscoveryLines("1. Sampha - Spirit 2.0 3:45\n2) Yaya Bey - Karma")).toEqual([
      { artistName: "Sampha", title: "Spirit 2.0" },
      { artistName: "Yaya Bey", title: "Karma" },
    ]);
  });

  it("drops blank lines and repeats", () => {
    expect(
      parseDiscoveryLines("Sampha - Spirit 2.0\n\n  \nsampha - SPIRIT 2.0\nSampha - Plastic"),
    ).toEqual([
      { artistName: "Sampha", title: "Spirit 2.0" },
      { artistName: "Sampha", title: "Plastic" },
    ]);
  });

  it("returns nothing for an empty paste", () => {
    expect(parseDiscoveryLines("\n   \n")).toEqual([]);
  });
});
