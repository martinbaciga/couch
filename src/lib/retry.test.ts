import { describe, expect, it } from "vitest";
import { retryDelay } from "./retry";

describe("retryDelay", () => {
  it("doubles from one second and stops at one minute", () => {
    expect(retryDelay(0)).toBe(1000);
    expect(retryDelay(1)).toBe(2000);
    expect(retryDelay(2)).toBe(4000);
    expect(retryDelay(5)).toBe(32_000);
    expect(retryDelay(6)).toBe(60_000);
    expect(retryDelay(20)).toBe(60_000);
  });

  it("treats an invalid attempt as the first wait", () => {
    expect(retryDelay(-1)).toBe(1000);
    expect(retryDelay(1.5)).toBe(1000);
  });
});
