import { describe, expect, it } from "vitest";
import { parseTracklist } from "@/lib/tracklist";

describe("parseTracklist", () => {
  it("reads a numbered list with running times", () => {
    expect(
      parseTracklist("1. Airbag 4:44\n2. Paranoid Android 6:23\n3. Subterranean 4:27"),
    ).toEqual([
      { title: "Airbag", position: 1, duration: 284 },
      { title: "Paranoid Android", position: 2, duration: 383 },
      { title: "Subterranean", position: 3, duration: 267 },
    ]);
  });

  it("copes with bare titles and no numbering at all", () => {
    expect(parseTracklist("Airbag\nParanoid Android")).toEqual([
      { title: "Airbag", position: 1, duration: null },
      { title: "Paranoid Android", position: 2, duration: null },
    ]);
  });

  it("accepts the separators a copied sleeve tends to carry", () => {
    const tracks = parseTracklist(
      ["01) Airbag – 4:44", "02 - Exit Music (3:24)", "3.  Let Down\t4:59"].join("\n"),
    );

    expect(tracks.map((track) => track.title)).toEqual([
      "Airbag",
      "Exit Music",
      "Let Down",
    ]);
    expect(tracks.map((track) => track.duration)).toEqual([284, 204, 299]);
  });

  it("keeps a leading number that is part of the title", () => {
    // Nothing else in this list is numbered, so the 99 is the song's own.
    expect(parseTracklist("99 Problems\nEncore").map((t) => t.title)).toEqual([
      "99 Problems",
      "Encore",
    ]);
  });

  it("strips the numbering when the list really is numbered", () => {
    expect(
      parseTracklist("1. Interlude\n2. 99 Problems\n3. Encore").map((t) => t.title),
    ).toEqual(["Interlude", "99 Problems", "Encore"]);
  });

  it("handles a running time over an hour", () => {
    expect(parseTracklist("Long One 1:02:30")[0].duration).toBe(3750);
  });

  it("ignores blank lines and renumbers what's left", () => {
    const tracks = parseTracklist("\n  \nFirst\n\nSecond\n   \n");
    expect(tracks.map((track) => track.position)).toEqual([1, 2]);
    expect(tracks).toHaveLength(2);
  });

  it("returns nothing for an empty paste", () => {
    expect(parseTracklist("   \n\n")).toEqual([]);
  });

  it("does not read a year as a running time", () => {
    expect(parseTracklist("Nineteen Eighty Four")[0]).toEqual({
      title: "Nineteen Eighty Four",
      position: 1,
      duration: null,
    });
  });
});
