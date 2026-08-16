import { describe, expect, it } from "vitest";
import { buildLibraryIndex, matchDiscovery, nameKey } from "@/lib/discovery-match";

const index = buildLibraryIndex({
  artists: [
    { id: "a1", name: "Sampha", status: "ACTIVE" },
    { id: "a2", name: "Tyler, The Creator", status: "ACTIVE" },
    { id: "a3", name: "Old Favourite", status: "PAUSED" },
  ],
  heard: [
    { artistId: "a1", title: "Spirit 2.0" },
    { artistId: "a3", title: "The Album (Deluxe Edition)" },
  ],
});

describe("nameKey", () => {
  it("ignores case, punctuation and accents", () => {
    expect(nameKey("SAULT")).toBe(nameKey("Sault"));
    expect(nameKey("Tyler, The Creator")).toBe(nameKey("Tyler the Creator"));
    expect(nameKey("Sigur Rós")).toBe(nameKey("Sigur Ros"));
  });
});

describe("matchDiscovery", () => {
  it("finds nothing for an artist not in the library", () => {
    expect(matchDiscovery({ artistName: "Nobody", title: "A Song" }, index)).toEqual({
      artistId: null,
      paused: false,
      heard: false,
    });
  });

  it("recognises a followed artist however the name is punctuated", () => {
    const match = matchDiscovery({ artistName: "tyler the creator", title: null }, index);
    expect(match.artistId).toBe("a2");
    expect(match.paused).toBe(false);
  });

  it("reports a paused artist as in the library, not as followed", () => {
    expect(matchDiscovery({ artistName: "Old Favourite", title: null }, index)).toMatchObject(
      { artistId: "a3", paused: true },
    );
  });

  it("spots a song already ticked off", () => {
    expect(
      matchDiscovery({ artistName: "Sampha", title: "Spirit 2.0" }, index).heard,
    ).toBe(true);
  });

  it("still matches when the playlist names the plain edition", () => {
    // The library holds the deluxe; the playlist entry is the same record.
    expect(
      matchDiscovery({ artistName: "Old Favourite", title: "The Album" }, index).heard,
    ).toBe(true);
  });

  it("does not call an unheard song heard", () => {
    expect(
      matchDiscovery({ artistName: "Sampha", title: "Plastic 100°C" }, index).heard,
    ).toBe(false);
  });

  it("treats an artist-only lead as something still to explore", () => {
    // Following someone doesn't mean you've heard whatever prompted the lead.
    expect(matchDiscovery({ artistName: "Sampha", title: null }, index).heard).toBe(false);
  });
});
