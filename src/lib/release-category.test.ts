import { describe, expect, it } from "vitest";
import { countByCategory, releaseCategory } from "@/lib/release-category";

describe("releaseCategory", () => {
  it("falls back to the provider's type when the title says nothing", () => {
    expect(releaseCategory("In Rainbows", "ALBUM")).toBe("album");
    expect(releaseCategory("Testbag", "EP")).toBe("ep");
    expect(releaseCategory("Spectre", "SINGLE")).toBe("single");
  });

  it("reads packaging out of the title, whatever the type claims", () => {
    expect(releaseCategory("Kid A (Deluxe Edition)", "ALBUM")).toBe("deluxe");
    expect(releaseCategory("OK Computer OKNOTOK 20th Anniversary", "ALBUM")).toBe(
      "deluxe",
    );
    expect(releaseCategory("The Bends [2016 Remaster]", "ALBUM")).toBe("remaster");
    expect(releaseCategory("Amnesiac (Reissue)", "ALBUM")).toBe("remaster");
  });

  it("separates the kinds a type of OTHER used to swallow whole", () => {
    expect(releaseCategory("Greatest Hits", "OTHER")).toBe("compilation");
    expect(releaseCategory("Live at the Astoria", "OTHER")).toBe("live");
    expect(releaseCategory("Suspiria (Original Motion Picture Soundtrack)", "OTHER")).toBe(
      "soundtrack",
    );
  });

  it("calls a bare OTHER a compilation, which is what the provider means by it", () => {
    expect(releaseCategory("Some Odd Record", "OTHER")).toBe("compilation");
  });

  it("prefers what a record is over how it was packaged", () => {
    // Both signals present: the compilation is the more useful label, since
    // hiding compilations should hide this whether or not it was remastered.
    expect(releaseCategory("Greatest Hits (Remastered)", "ALBUM")).toBe("compilation");
    expect(releaseCategory("Live in Paris (Deluxe)", "ALBUM")).toBe("live");
  });

  it("does not mistake a word that merely contains a keyword", () => {
    expect(releaseCategory("Living Room", "ALBUM")).toBe("album");
    expect(releaseCategory("Singles Ward", "ALBUM")).toBe("compilation");
  });
});

describe("countByCategory", () => {
  it("counts each kind, leaving absent ones out entirely", () => {
    const counts = countByCategory([
      { title: "One", type: "ALBUM" },
      { title: "Two", type: "ALBUM" },
      { title: "Three", type: "SINGLE" },
      { title: "Best Of", type: "OTHER" },
    ]);

    expect(counts.get("album")).toBe(2);
    expect(counts.get("single")).toBe(1);
    expect(counts.get("compilation")).toBe(1);
    expect(counts.has("soundtrack")).toBe(false);
  });
});
