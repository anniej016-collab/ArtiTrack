import { describe, expect, it } from "vitest";
import { groupReleases } from "@/lib/grouping";

const release = (artistId: string, name: string, iso: string) => ({
  artistId,
  artist: { name },
  releaseDate: new Date(`${iso}T00:00:00Z`),
});

describe("groupReleases", () => {
  const sameYear = [
    release("a", "Beta", "2026-08-01"),
    release("b", "Alpha", "2026-08-20"),
    release("a", "Beta", "2026-07-04"),
  ];
  const acrossYears = [...sameYear, release("b", "Alpha", "2019-12-25")];

  it("omits the year when the queue sits in a single year", () => {
    expect(groupReleases(sameYear, "date").map((g) => g.label)).toEqual([
      "August",
      "July",
    ]);
  });

  it("adds the year once the queue spans more than one", () => {
    expect(groupReleases(acrossYears, "date").map((g) => g.label)).toEqual([
      "August 2026",
      "July 2026",
      "December 2019",
    ]);
  });

  it("orders date groups newest first", () => {
    expect(groupReleases(acrossYears, "date").map((g) => g.items.length)).toEqual([
      2, 1, 1,
    ]);
  });

  it("buckets dates in UTC so the 1st doesn't fall into the previous month", () => {
    // Stored as UTC midnight; reading it in a negative-offset zone would say December.
    expect(
      groupReleases([release("z", "Z", "2026-01-01")], "date").map((g) => g.label),
    ).toEqual(["January"]);
  });

  it("groups by artist alphabetically and carries the id for linking", () => {
    const groups = groupReleases(acrossYears, "artist");
    expect(groups.map((g) => g.label)).toEqual(["Alpha", "Beta"]);
    expect(groups.map((g) => g.artistId)).toEqual(["b", "a"]);
  });

  it("returns one flat group when grouping is off", () => {
    expect(groupReleases(acrossYears, "none")).toHaveLength(1);
    expect(groupReleases(acrossYears, "none")[0].items).toHaveLength(4);
  });

  it("survives an empty list", () => {
    expect(groupReleases([], "artist")[0].items).toEqual([]);
  });
});
