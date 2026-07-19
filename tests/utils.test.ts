import { describe, it, expect } from "vitest";
import { makeSlug, compact } from "../cli/utils.js";

describe("makeSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(makeSlug("Some API Name")).toBe("some-api-name");
  });

  it("strips special characters", () => {
    expect(makeSlug("AI & ML: Stuff!")).toBe("ai-and-ml-stuff");
  });
});

describe("compact", () => {
  it("drops null, undefined, empty strings and empty arrays", () => {
    expect(compact({ a: 1, b: null, c: undefined, d: "", e: [], f: "keep" })).toEqual({
      a: 1,
      f: "keep",
    });
  });

  it("compacts nested objects", () => {
    expect(compact({ spec: { type: "openapi", url: null } })).toEqual({
      spec: { type: "openapi" },
    });
  });

  it("keeps false and zero", () => {
    expect(compact({ https: false, stars: 0 })).toEqual({ https: false, stars: 0 });
  });
});
