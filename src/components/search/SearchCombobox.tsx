"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { SearchIcon } from "@/components/ui/icons";
import { focusRing } from "@/components/ui/styles";
import {
  isSearchableQuery,
  normaliseQuery,
  searchUrl,
  titleUrl,
  type SearchResult,
} from "@/lib/search/query";
import {
  scrollTopForFirstOption,
  scrollTopForOption,
} from "@/lib/search/scroll";
import {
  clearViewed,
  rememberViewed,
  removeViewed,
  useRecentlyViewed,
} from "@/lib/storage/use-recent";
import { KeyHint } from "./KeyHint";
import { SearchResultsPanel, type PanelMode } from "./SearchResultsPanel";
import { useComboboxNavigation } from "./useComboboxNavigation";
import { useTitleSearch } from "./useTitleSearch";

/** Keep the highlighted row inside the scrolling list. */
function revealSelected(panel: HTMLElement) {
  const option = panel.querySelector("[aria-selected='true']");
  if (!(option instanceof HTMLElement)) return;
  const list = panel.getBoundingClientRect();
  const row = option.getBoundingClientRect();
  const first = panel.querySelector("[role='option']");
  const lead =
    option === first ? panel.querySelector(".kicker")?.parentElement : null;
  if (lead instanceof HTMLElement) {
    panel.scrollTop = scrollTopForFirstOption(
      panel.scrollTop,
      list.top,
      list.bottom,
      row.top,
      row.bottom,
      lead.getBoundingClientRect().top,
    );
    return;
  }
  panel.scrollTop = scrollTopForOption(
    panel.scrollTop,
    list.top,
    list.bottom,
    row.top,
    row.bottom,
  );
}

/** Mobile hero panel: three titles, then "See all results". */
const HERO_MOBILE_ROWS = 3;

type SearchComboboxProps = {
  variant: "hero" | "modal";
  /** Escape, Cancel, and the scrim. */
  onDismiss?: () => void;
  /** A row or suggestion was chosen and its link will navigate. */
  onCommit?: () => void;
  /** Keyboard chose a row, so there is no link click to follow. */
  onOpenHref?: (href: string) => void;
};

/**
 * Shared search field. `hero` drops the panel under (or, on a small
 * screen, above) the field. `modal` keeps it in the dialog flow.
 */
export function SearchCombobox({
  variant,
  onDismiss,
  onCommit,
  onOpenHref,
}: SearchComboboxProps) {
  const t = useTranslations();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const baseId = useId();
  const listId = `${baseId}-list`;
  const labelId = `${baseId}-label`;
  const fieldId = `${baseId}-field`;
  const [value, setValue] = useState("");
  // Chrome files saved entries under the field name and ignores autocomplete
  // "off". A new name on each mount has no saved list. Submit must stay in
  // script. See the development guide, "Search: one logic, two layouts".
  const [fieldName, setFieldName] = useState("couch-title");
  const [narrow, setNarrow] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [dismissedQuery, setDismissedQuery] = useState("");
  const query = normaliseQuery(value);
  const search = useTitleSearch(value, { live: true });
  const recent = useRecentlyViewed();
  const { state } = search;

  if (dismissed && dismissedQuery !== query) {
    setDismissed(false);
  }

  const mode = panelMode(variant, query, state.status, recent.length > 0);
  const rows = mode === "recent" ? recent : state.results;
  // The mobile hero panel opens upward and keeps at most three titles.
  const shown =
    variant === "hero" && narrow && mode === "results"
      ? rows.slice(0, HERO_MOBILE_ROWS)
      : rows;
  const optionCount =
    mode === "results"
      ? shown.length + 1
      : mode === "recent"
        ? shown.length
        : 0;
  const signature = `${mode}:${shown.map((row) => `${row.kind}-${row.id}`).join(",")}`;
  const navigation = useComboboxNavigation(signature, optionCount);
  const panelOpen =
    variant === "modal"
      ? mode !== "loading"
      : !dismissed && (mode === "results" || mode === "empty");

  useIsoLayoutEffect(() => {
    setFieldName(`couch-title-${Math.random().toString(36).slice(2, 10)}`);
  }, []);

  // Leaving the landing hides this page instead of unmounting it, so a typed
  // query would still be here on Back or the logo. Drop it while hidden.
  useIsoLayoutEffect(() => {
    if (variant !== "hero") return;
    return () => {
      setValue("");
      setDismissed(false);
      setDismissedQuery("");
      setNotice("");
    };
  }, [variant]);

  useEffect(() => {
    const list = window.matchMedia("(max-width: 47.99rem)");
    const apply = () => setNarrow(list.matches);
    apply();
    list.addEventListener("change", apply);
    return () => list.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (variant !== "hero" || !narrow || !panelOpen) {
      panel.style.removeProperty("max-height");
      return;
    }

    function measure() {
      const field = fieldRef.current;
      const node = panelRef.current;
      const viewport = window.visualViewport;
      if (!field || !node || !viewport) return;
      const headerBottom =
        document.querySelector("header")?.getBoundingClientRect().bottom ??
        viewport.offsetTop;
      const limit = Math.max(headerBottom, viewport.offsetTop);
      const available = field.getBoundingClientRect().top - limit - 6;
      node.style.maxHeight = `${Math.max(0, Math.floor(available))}px`;
      revealSelected(node);
    }

    measure();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    return () => {
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      panel.style.removeProperty("max-height");
    };
  }, [variant, narrow, panelOpen]);

  useIsoLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !navigation.keyboard || navigation.active < 0) return;
    revealSelected(panel);
  }, [navigation.keyboard, navigation.active, panelOpen, signature]);

  // The hero panel is taken out of flow, so it would cover the setup line
  // under the field. Reserve that space while it is open.
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const panel = panelRef.current;
    if (variant !== "hero" || !panelOpen || !panel) {
      root.style.removeProperty("margin-bottom");
      return;
    }
    const extra =
      panel.getBoundingClientRect().bottom - root.getBoundingClientRect().bottom;
    if (extra > 1) root.style.marginBottom = `${Math.ceil(extra)}px`;
    else root.style.removeProperty("margin-bottom");
  }, [variant, panelOpen, signature, narrow]);

  useEffect(() => {
    if (variant !== "hero" || !panelOpen) return;
    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) {
        setDismissed(true);
        setDismissedQuery(query);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [variant, panelOpen, query]);

  function optionId(index: number) {
    return `${baseId}-opt-${index}`;
  }

  function go(href: string) {
    if (onOpenHref) onOpenHref(href);
    else router.push(href);
  }

  function openIndex(index: number) {
    if (mode === "results" && index === shown.length) {
      go(searchUrl(query));
      return;
    }
    const row = shown[index];
    if (!row) return;
    rememberViewed(row);
    go(titleUrl(row.kind, row.id, row.title));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSearchableQuery(query)) return;
    if (navigation.active >= 0) {
      openIndex(navigation.active);
      return;
    }
    go(searchUrl(query));
  }

  function removeRow(row: SearchResult) {
    const last = mode === "recent" && shown.length === 1;
    removeViewed(row.kind, row.id);
    setNotice(t("search.removed", { title: row.title }));
    if (last) fieldRef.current?.focus();
  }

  function clearRows() {
    clearViewed();
    fieldRef.current?.focus();
  }

  function onEscape() {
    setDismissed(true);
    setDismissedQuery(query);
  }

  const announcement =
    state.status === "results" || state.status === "empty"
      ? t("search.matches", { count: state.results.length })
      : "";
  const keyed = navigation.keyboard && navigation.active >= 0;
  const fieldHint = isSearchableQuery(query)
    ? t("search.enter")
    : t("search.esc");

  return (
    <div
      ref={rootRef}
      className={
        variant === "hero" ? "relative w-full" : "flex min-h-0 flex-1 flex-col"
      }
    >
      <form
        action="/search"
        method="get"
        autoComplete="off"
        onSubmit={onSubmit}
        className={variant === "modal" ? "shrink-0" : undefined}
      >
        <input type="hidden" name="q" value={value} readOnly />
        <div
          className={
            variant === "modal" ? "flex items-center gap-3 px-4 pt-4 pb-3" : ""
          }
        >
          <div
            className={
              variant === "hero"
                ? "field-focus flex min-w-0 items-center gap-5 rounded-control border-control border-border-strong bg-surface-field p-field"
                : "field-focus flex h-14 min-w-0 flex-1 items-center gap-3 rounded-control border-control border-border-strong bg-surface-field ps-4 pe-3"
            }
          >
            {variant === "hero" ? null : (
              <SearchIcon className="size-4 shrink-0 text-text-default" />
            )}
            <label htmlFor={fieldId} className="sr-only">
              {t("search.label")}
            </label>
            <input
              ref={fieldRef}
              id={fieldId}
              name={fieldName}
              autoComplete="off"
              data-autofocus={variant === "modal" ? "" : undefined}
              role="combobox"
              aria-expanded={panelOpen}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                navigation.active >= 0 ? optionId(navigation.active) : undefined
              }
              enterKeyHint="search"
              value={value}
              maxLength={100}
              placeholder={t("search.placeholder")}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Delete" &&
                  mode === "recent" &&
                  navigation.keyboard &&
                  navigation.active >= 0
                ) {
                  const row = shown[navigation.active];
                  if (!row) return;
                  event.preventDefault();
                  removeRow(row);
                  return;
                }
                const key = navigation.onKeyDown(event);
                if (key === "escape" && variant === "hero") onEscape();
                else if (typeof key === "number") openIndex(key);
              }}
              className={
                variant === "hero"
                  ? "min-w-0 flex-1 bg-transparent px-2.5 text-input text-text-default outline-none placeholder:text-text-muted md:text-search"
                  : "min-w-0 flex-1 bg-transparent text-search text-text-default outline-none placeholder:text-text-muted"
              }
            />
            {variant === "hero" ? (
              <Button type="submit">{t("search.label")}</Button>
            ) : null}
            {variant === "modal" && !keyed ? (
              <KeyHint label={fieldHint} />
            ) : null}
          </div>
          {variant === "modal" ? (
            <button
              type="button"
              onClick={onDismiss}
              className={`inline-flex min-h-11 shrink-0 items-center px-1 text-search font-medium text-text-default md:hidden ${focusRing}`}
            >
              {t("search.cancel")}
            </button>
          ) : null}
        </div>
      </form>
      {panelOpen ? (
        <div
          ref={panelRef}
          className={
            variant === "hero"
              ? "absolute inset-x-0 bottom-full z-30 mb-1.5 max-h-80 overflow-y-auto rounded-xl border border-border-default bg-primary-100 shadow-toast md:top-full md:bottom-auto md:mt-1.5 md:mb-0"
              : "min-h-0 flex-1 overflow-y-auto"
          }
        >
          <SearchResultsPanel
            mode={mode}
            query={query}
            rows={shown}
            listId={listId}
            labelId={labelId}
            optionId={optionId}
            activeIndex={navigation.active}
            seeAllHref={mode === "results" ? searchUrl(query) : undefined}
            keyboard={navigation.keyboard}
            onRemove={mode === "recent" ? removeRow : undefined}
            onClear={mode === "recent" ? clearRows : undefined}
            onSelect={(row) => {
              rememberViewed(row);
              onCommit?.();
            }}
            onClose={() => onCommit?.()}
          />
        </div>
      ) : (
        <div id={listId} hidden />
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <p className="sr-only" aria-live="polite">
        {notice}
      </p>
    </div>
  );
}

/** useLayoutEffect once effects can run. The server render has no window. */
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function panelMode(
  variant: "hero" | "modal",
  query: string,
  status: "idle" | "loading" | "results" | "empty" | "error",
  hasRecent: boolean,
): PanelMode {
  if (!query) {
    if (variant === "hero") return "loading";
    return hasRecent ? "recent" : "hint";
  }
  if (status === "results") return "results";
  if (status === "empty" || status === "error") return "empty";
  return "loading";
}
