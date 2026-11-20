import { describe, expect, it } from "vitest";
import { backLabel, safeReturnPath, settingsHref } from "./return-path";

describe("safeReturnPath", () => {
  it("keeps a same-origin path, including its query", () => {
    expect(safeReturnPath("/")).toBe("/");
    expect(safeReturnPath("/search?q=heat")).toBe("/search?q=heat");
    expect(safeReturnPath("/title/movie/550/fight-club")).toBe(
      "/title/movie/550/fight-club",
    );
    expect(safeReturnPath("/title/movie/550?view=country")).toBe(
      "/title/movie/550?view=country",
    );
    expect(safeReturnPath("/watchlist")).toBe("/watchlist");
    expect(safeReturnPath("/search?q=2001: A Space Odyssey")).toBe(
      "/search?q=2001: A Space Odyssey",
    );
  });

  it("drops a hash and still returns the page", () => {
    expect(safeReturnPath("/title/movie/550#cast")).toBe("/title/movie/550");
    expect(safeReturnPath("/search?q=heat#more")).toBe("/search?q=heat");
  });

  it("rejects a missing value", () => {
    expect(safeReturnPath(null)).toBeNull();
    expect(safeReturnPath("")).toBeNull();
    expect(safeReturnPath("#cast")).toBeNull();
  });

  it("rejects an absolute URL", () => {
    expect(safeReturnPath("https://example.com/title")).toBeNull();
    expect(safeReturnPath("http://example.com")).toBeNull();
    expect(safeReturnPath("HTTPS://example.com")).toBeNull();
  });

  it("rejects a path that starts with a double slash", () => {
    expect(safeReturnPath("//example.com")).toBeNull();
    expect(safeReturnPath("//example.com/title")).toBeNull();
  });

  it("rejects a value that contains a scheme", () => {
    expect(safeReturnPath("javascript:alert(1)")).toBeNull();
    expect(safeReturnPath("/next?to=javascript:alert(1)")).toBeNull();
    expect(safeReturnPath("/next?to=https://example.com")).toBeNull();
  });

  it("rejects a backslash", () => {
    expect(safeReturnPath("/\\example.com")).toBeNull();
    expect(safeReturnPath("/title\\movie")).toBeNull();
    expect(safeReturnPath("\\\\example.com")).toBeNull();
  });

  it("rejects a return to settings itself", () => {
    expect(safeReturnPath("/settings")).toBeNull();
    expect(safeReturnPath("/settings?return=%2F")).toBeNull();
    expect(safeReturnPath("/settings/")).toBeNull();
    expect(safeReturnPath("/settings/extra")).toBeNull();
  });

  it("rejects a return longer than 200 characters", () => {
    expect(safeReturnPath(`/${"a".repeat(199)}`)).toBe(`/${"a".repeat(199)}`);
    expect(safeReturnPath(`/${"a".repeat(200)}`)).toBeNull();
  });

  it("rejects a path that does not start with a single slash", () => {
    expect(safeReturnPath("settings")).toBeNull();
    expect(safeReturnPath(" /title")).toBeNull();
    expect(safeReturnPath("../title")).toBeNull();
  });
});

describe("settingsHref", () => {
  it("encodes the current path as the return query", () => {
    expect(settingsHref("/")).toBe("/settings?return=%2F");
    expect(settingsHref("/search?q=heat")).toBe(
      "/settings?return=%2Fsearch%3Fq%3Dheat",
    );
    expect(settingsHref("/title/movie/550/fight-club?view=country")).toBe(
      "/settings?return=%2Ftitle%2Fmovie%2F550%2Ffight-club%3Fview%3Dcountry",
    );
  });

  it("drops the hash before encoding", () => {
    expect(settingsHref("/title/movie/550#cast")).toBe(
      "/settings?return=%2Ftitle%2Fmovie%2F550",
    );
  });

  it("omits return when the path is not safe", () => {
    expect(settingsHref("/settings")).toBe("/settings");
    expect(settingsHref("/settings?return=%2F")).toBe("/settings");
    expect(settingsHref(`/${"a".repeat(200)}`)).toBe("/settings");
    expect(settingsHref("https://example.com")).toBe("/settings");
  });
});

describe("backLabel", () => {
  it("names a title, the home page, search results, and anything else", () => {
    expect(backLabel("/title/movie/550/fight-club")).toBe("title");
    expect(backLabel("/title/tv/1396?view=country")).toBe("title");
    expect(backLabel("/")).toBe("home");
    expect(backLabel("/?from=share")).toBe("home");
    expect(backLabel("/search")).toBe("results");
    expect(backLabel("/search?q=heat")).toBe("results");
    expect(backLabel("/watchlist")).toBe("back");
    expect(backLabel("/about")).toBe("back");
  });
});
