import { cpSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const source = join(
  dirname(require.resolve("circle-flags/package.json")),
  "flags",
);
const destination = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "flags",
);

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
