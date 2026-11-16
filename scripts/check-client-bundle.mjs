import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TOKEN_NAME = "TMDB_READ_ACCESS_TOKEN";
const MIN_TOKEN_LENGTH = 20;

export async function findClientBundleLeaks(staticDir, token) {
  const files = await listFiles(staticDir);
  const leaks = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (text.includes(TOKEN_NAME)) leaks.push({ file, kind: "name" });
    if (token && token.length >= MIN_TOKEN_LENGTH && text.includes(token)) {
      leaks.push({ file, kind: "value" });
    }
  }
  return leaks;
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(fullPath)));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const staticDir = path.resolve(".next/static");
  const token = process.env[TOKEN_NAME] ?? "";
  const leaks = await findClientBundleLeaks(staticDir, token);
  if (leaks.length === 0) {
    process.exit(0);
  }
  const kinds = [...new Set(leaks.map((leak) => leak.kind))].join(", ");
  console.error(
    `TMDB token leaked into the client bundle (${kinds}). Refusing to continue.`,
  );
  process.exit(1);
}
