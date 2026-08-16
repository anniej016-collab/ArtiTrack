import { describe, expect, it } from "vitest";
import { parseDiscography } from "@/lib/import/discography";
import { extractArrayLiteral, objectLiteralToJson } from "@/lib/import/js-literal";

/** Shaped like the real file: bare keys, comments, stars, a trailing comma. */
const FIXTURE = `
<html><body><script>
const LINEUP = ["A","B"];

/* ---------- data ---------- */
const DATA = [
{d:"2018-03-14",u:"NCT",t:"Empathy",ty:"Studio Album",la:"Korean",m:["Taeyong"],n:"1st album · don't stop",cv:"https://example.test/a.jpg",tl:[{"t":"Intro","url":"https://x.test/1"},{"t":"★Boss (NCT U)","url":"https://x.test/2"}]},
/* a year we only half know */
{d:"2017",ap:true,u:"NCT",t:"Stay in My Life",ty:"OST",la:"Korean",m:["Taeil","Doyoung"]},
{d:"2024-05",u:"Solo",t:"Youth",ty:"Studio Album",la:"Korean",m:["Doyoung"],tl:["One","Two"]},
{d:"2021-01-01",u:"WayV",t:"Kick Back",ty:"EP",la:"Mandarin",m:["Ten"]},
];

const OTHER = [1,2,3];
</script></body></html>
`;

describe("objectLiteralToJson", () => {
  it("quotes bare keys and drops comments and trailing commas", () => {
    const json = objectLiteralToJson('[/* hi */ {a:"1", b:2,}, ]');
    expect(JSON.parse(json)).toEqual([{ a: "1", b: 2 }]);
  });

  it("leaves the inside of a string alone", () => {
    // Braces, colons and comment markers inside text must survive untouched.
    const json = objectLiteralToJson('[{t:"Time: 4/4 {live} // best"}]');
    expect(JSON.parse(json)).toEqual([{ t: "Time: 4/4 {live} // best" }]);
  });

  it("handles single quotes and the apostrophes inside them", () => {
    const json = objectLiteralToJson("[{t:'Baby Don\\'t Stop'}]");
    expect(JSON.parse(json)).toEqual([{ t: "Baby Don't Stop" }]);
  });

  it("keeps already-quoted keys as they are", () => {
    const json = objectLiteralToJson('[{"t":"x",u:"y"}]');
    expect(JSON.parse(json)).toEqual([{ t: "x", u: "y" }]);
  });
});

describe("extractArrayLiteral", () => {
  it("takes the named array and stops at its own closing bracket", () => {
    const literal = extractArrayLiteral(FIXTURE, "DATA")!;
    expect(literal.startsWith("[")).toBe(true);
    expect(literal.endsWith("]")).toBe(true);
    // Not the array declared after it, nor the one before.
    expect(literal).not.toContain("OTHER");
    expect(literal).not.toContain("LINEUP");
  });

  it("returns null when there is no such array", () => {
    expect(extractArrayLiteral(FIXTURE, "MISSING")).toBeNull();
  });
});

describe("parseDiscography", () => {
  const { releases, skipped } = parseDiscography(FIXTURE);

  it("reads every row", () => {
    expect(releases).toHaveLength(4);
    expect(skipped).toEqual([]);
  });

  it("files a solo release under the member, not under 'Solo'", () => {
    expect(releases.map((release) => release.artistName)).toEqual([
      "NCT",
      "NCT",
      "Doyoung",
      "WayV",
    ]);
  });

  it("fills in a partial date rather than dropping the release", () => {
    expect(releases[1].releaseDate.toISOString()).toBe("2017-01-01T00:00:00.000Z");
    expect(releases[2].releaseDate.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  it("maps the file's own vocabulary onto the four stored types", () => {
    expect(releases.map((release) => release.type)).toEqual([
      "ALBUM",
      "OTHER",
      "ALBUM",
      "EP",
    ]);
  });

  it("keeps the file's wording for the type in the note", () => {
    expect(releases[0].notes).toBe("Studio Album · 1st album · don't stop");
    // An OST is stored as OTHER, so the word itself is the only record of it.
    expect(releases[1].notes).toBe("OST");
  });

  it("strips the title-track star from song names", () => {
    expect(releases[0].tracks.map((track) => track.title)).toEqual([
      "Intro",
      "Boss (NCT U)",
    ]);
  });

  it("accepts a tracklist of plain titles as well as objects", () => {
    expect(releases[2].tracks).toEqual([
      { title: "One", position: 1 },
      { title: "Two", position: 2 },
    ]);
  });

  it("gives each release a key that survives a re-import", () => {
    const again = parseDiscography(FIXTURE);
    expect(again.releases.map((r) => r.externalId)).toEqual(
      releases.map((r) => r.externalId),
    );
    expect(new Set(releases.map((r) => r.externalId)).size).toBe(4);
  });

  it("says so rather than guessing when the data isn't there", () => {
    expect(() => parseDiscography("<html>nothing here</html>")).toThrow(
      /Couldn't find the release data/,
    );
  });

  it("names what it skipped instead of dropping it quietly", () => {
    const { releases: kept, skipped: dropped } = parseDiscography(
      'const DATA = [{d:"2020-01-01",u:"NCT"},{d:"nope",u:"NCT",t:"Undated"}];',
    );
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(2);
    expect(dropped[1]).toMatch(/Undated/);
  });
});
