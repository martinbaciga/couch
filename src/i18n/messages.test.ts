import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import messages from "../../messages/en.json";

function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const fullPath = path.join(directory, name);
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts"))
      return [fullPath];
    return [];
  });
}

describe("messages", () => {
  it("matches the keys used in the app", () => {
    const defined = new Set(flatten(messages));
    const used = new Set<string>();
    const root = path.resolve(import.meta.dirname, "..");

    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']/g)) {
        const key = match[1];
        if (key) used.add(key);
      }
    }

    const missing = [...used].filter((key) => !defined.has(key)).sort();
    const unused = [...defined].filter((key) => !used.has(key)).sort();
    expect({ missing, unused }).toEqual({ missing: [], unused: [] });
  });
});
