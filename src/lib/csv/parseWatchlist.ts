export const MAX_WATCHLIST_BYTES = 2 * 1024 * 1024;
export const MAX_WATCHLIST_ROWS = 2_000;

export type WatchlistEntry = {
  date: string;
  name: string;
  year: number | null;
  uri: string;
};

export type ParsedWatchlist = {
  entries: WatchlistEntry[];
  skipped: number;
};

/** The header has no Name and Year columns. */
export class WatchlistParseError extends Error {
  readonly code = "header" as const;

  constructor() {
    super("header");
    this.name = "WatchlistParseError";
  }
}

/**
 * A Letterboxd watchlist export.
 * Rows with no name are skipped and counted. Blank lines are ignored.
 * Duplicate rows are kept; the matcher drops repeated URIs later.
 */
export function parseWatchlist(text: string): ParsedWatchlist {
  const table = parseCsv(text);
  const header = table[0];
  if (!header) throw new WatchlistParseError();

  const columns = new Map<string, number>();
  header.forEach((cell, index) => {
    const key = cell.trim().toLowerCase();
    if (key && !columns.has(key)) columns.set(key, index);
  });
  const nameAt = columns.get("name");
  const yearAt = columns.get("year");
  if (nameAt === undefined || yearAt === undefined) {
    throw new WatchlistParseError();
  }
  const dateAt = columns.get("date");
  const uriAt = columns.get("letterboxd uri");

  const entries: WatchlistEntry[] = [];
  let skipped = 0;
  for (const row of table.slice(1)) {
    if (row.every((cell) => cell.trim() === "")) continue;
    const name = cell(row, nameAt).trim();
    if (!name) {
      skipped += 1;
      continue;
    }
    entries.push({
      date: dateAt === undefined ? "" : cell(row, dateAt).trim(),
      name,
      year: parseYear(cell(row, yearAt)),
      uri: uriAt === undefined ? "" : cell(row, uriAt).trim(),
    });
  }
  return { entries, skipped };
}

/** Size and emptiness, after a header has already parsed. */
export function importBlock(
  parsed: ParsedWatchlist,
  byteLength: number,
): "too-big" | "empty" | null {
  const rows = parsed.entries.length + parsed.skipped;
  if (byteLength > MAX_WATCHLIST_BYTES || rows > MAX_WATCHLIST_ROWS) {
    return "too-big";
  }
  if (parsed.entries.length === 0) return "empty";
  return null;
}

function cell(row: string[], index: number): string {
  return row[index] ?? "";
}

function parseYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const year = Number(trimmed);
  if (!Number.isInteger(year)) return null;
  return year;
}

/** RFC 4180. Matches the spike parser: quotes, escaped quotes, CRLF, LF, and a BOM. */
function parseCsv(text: string): string[][] {
  let source = text;
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => !(item.length === 1 && item[0] === ""));
}
