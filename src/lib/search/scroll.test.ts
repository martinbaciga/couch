import { describe, expect, it } from "vitest";
import { scrollTopForFirstOption, scrollTopForOption } from "./scroll";

describe("scrollTopForOption", () => {
  it("leaves the offset alone when the row is visible", () => {
    expect(scrollTopForOption(40, 0, 200, 20, 80)).toBe(40);
  });

  it("moves down when the row is below the list", () => {
    expect(scrollTopForOption(0, 100, 300, 280, 340)).toBe(40);
  });

  it("moves up when the row is above the list", () => {
    expect(scrollTopForOption(80, 100, 300, 60, 120)).toBe(40);
  });
});

describe("scrollTopForFirstOption", () => {
  it("scrolls up far enough to show the heading above the first row", () => {
    expect(scrollTopForFirstOption(80, 100, 400, 100, 160, 60)).toBe(40);
  });

  it("keeps the first row when the heading would push it out", () => {
    expect(scrollTopForFirstOption(0, 0, 50, 0, 40, -30)).toBe(0);
  });
});
