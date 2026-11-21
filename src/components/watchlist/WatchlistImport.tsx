"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { MessageCard } from "@/components/ui/MessageCard";
import { StateMessage } from "@/components/ui/StateMessage";
import {
  MAX_WATCHLIST_BYTES,
  MAX_WATCHLIST_ROWS,
  importBlock,
  parseWatchlist,
  type WatchlistEntry,
} from "@/lib/csv/parseWatchlist";
import { ImportError, runImport } from "@/lib/match/runImport";

const FILE_INPUT_ID = "watchlist-csv";

type FileProblem = "header" | "empty" | "too-big";
type MatchProblem = "busy" | "unavailable";

/**
 * Letterboxd import. The file is read in the browser and dropped.
 * Only the parsed rows are handed to the matcher. Nothing is stored here.
 */
export function WatchlistImport() {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const entriesRef = useRef<WatchlistEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const readId = useRef(0);
  const [problem, setProblem] = useState<FileProblem | null>(null);
  const [failure, setFailure] = useState<MatchProblem | null>(null);
  const [found, setFound] = useState<number | null>(null);

  useEffect(() => {
    document.title = t("import.title");
    return () => {
      abortRef.current?.abort();
    };
  }, [t]);

  function openPicker() {
    inputRef.current?.click();
  }

  function chooseAnother() {
    abortRef.current?.abort();
    entriesRef.current = [];
    setProblem(null);
    setFailure(null);
    setFound(null);
    openPicker();
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void readFile(file);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  }

  async function readFile(file: File) {
    const id = readId.current + 1;
    readId.current = id;
    if (file.size > MAX_WATCHLIST_BYTES) {
      rejectFile("too-big");
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      if (id === readId.current) rejectFile("header");
      return;
    }
    if (id !== readId.current) return;
    let parsed;
    try {
      parsed = parseWatchlist(text);
    } catch {
      rejectFile("header");
      return;
    }
    const block = importBlock(parsed, file.size);
    if (block) {
      rejectFile(block);
      return;
    }
    entriesRef.current = parsed.entries;
    setProblem(null);
    setFound(parsed.entries.length);
    await match(parsed.entries);
  }

  function rejectFile(next: FileProblem) {
    abortRef.current?.abort();
    entriesRef.current = [];
    setFound(null);
    setFailure(null);
    setProblem(next);
  }

  async function match(entries: WatchlistEntry[]) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFailure(null);
    try {
      await runImport(
        entries.map((entry) => ({
          name: entry.name,
          year: entry.year,
          uri: entry.uri,
          date: entry.date,
        })),
        { signal: controller.signal },
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setFailure(
        error instanceof ImportError && error.code === "rate_limited"
          ? "busy"
          : "unavailable",
      );
    }
  }

  function retry() {
    if (entriesRef.current.length === 0) return;
    void match(entriesRef.current);
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-4 md:flex-row md:items-start md:gap-20 md:pt-4 md:pb-10">
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-heading font-bold">{t("import.title")}</h1>
          <p className="text-search text-text-muted">{t("import.subtitle")}</p>
        </header>
        <ol className="flex list-none flex-col gap-5 p-0">
          <Step
            number="1"
            title={t("import.step1Title")}
            body={t("import.step1Body")}
          />
          <Step
            number="2"
            title={t("import.step2Title")}
            body={t("import.step2Body")}
          />
          <Step
            number="3"
            title={t("import.step3Title")}
            body={t("import.step3Body")}
          />
        </ol>
      </div>
      <div className="flex w-full min-w-0 flex-col gap-4 md:max-w-dialog md:flex-1">
        {found !== null ? (
          <p role="status" className="font-display text-section font-bold">
            {t("import.found", { count: found })}
          </p>
        ) : null}
        {problem === "header" ? (
          <StateMessage state="wrong-file" onChoose={chooseAnother} />
        ) : null}
        {problem === "empty" ? (
          <StateMessage state="empty-file" onChoose={chooseAnother} />
        ) : null}
        {problem === "too-big" ? (
          <MessageCard
            eyebrow={t("import.tooBigEyebrow")}
            title={t("import.tooBigTitle")}
            body={t("import.tooBigBody", { limit: MAX_WATCHLIST_ROWS })}
            action={
              <Button variant="secondary" size="small" onClick={chooseAnother}>
                {t("states.wrongFile.action")}
              </Button>
            }
          />
        ) : null}
        {failure ? <StateMessage state={failure} onRetry={retry} /> : null}
        {problem || failure ? null : (
          <label
            htmlFor={FILE_INPUT_ID}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-default bg-surface-card px-4 py-11 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <h2 className="text-section font-bold">
              {t("import.dropHeading")}
            </h2>
            <p className="text-body text-text-muted">{t("import.or")}</p>
            <Button
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openPicker();
              }}
            >
              {t("import.chooseFile")}
            </Button>
            <p className="text-caption text-text-muted">
              {t("import.dropCaption")}
            </p>
          </label>
        )}
        <input
          id={FILE_INPUT_ID}
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          aria-label={t("import.chooseFile")}
          className="sr-only"
          tabIndex={-1}
          onChange={onInput}
        />
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3.5 md:items-center">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-pill border-control border-border-strong text-body font-medium">
        {number}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-ui font-medium text-text-default">{title}</span>
        <span className="text-body text-text-muted">{body}</span>
      </span>
    </li>
  );
}
