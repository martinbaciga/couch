"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTranslations } from "next-intl";
import { containsFolded } from "@/lib/text";
import { Flag } from "./Flag";
import { CheckIcon, ChevronIcon } from "./icons";
import { focusRing } from "./styles";
import { useDialog } from "./useDialog";

export type CountryOption = {
  code: string;
  name: string;
};

type CountrySelectProps = {
  label: string;
  options: readonly CountryOption[];
  value: string | null;
  onChange: (code: string) => void;
};

const field =
  "flex h-13 w-full items-center gap-2 rounded-control border-control border-border-strong bg-surface-field px-4 text-start text-search text-text-default";

/** Searchable country field. A list under the field on a wide screen, a sheet on a narrow one. */
export function CountrySelect({
  label,
  options,
  value,
  onChange,
}: CountrySelectProps) {
  const t = useTranslations();
  const labelId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const dialogRef = useDialog(open && mobile, close);

  const selected = options.find((option) => option.code === value) ?? null;
  const filtered = options.filter((option) =>
    containsFolded(option.name, query),
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const apply = () => setMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open || mobile) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, mobile]);

  function openList() {
    setQuery("");
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.code === value),
      ),
    );
    setOpen(true);
  }

  function choose(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[active];
      if (option) choose(option.code);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const list =
    filtered.length === 0 ? (
      <p className="px-4 py-3 text-body text-text-muted">
        {t("settings.countryEmpty", { query: query.trim() })}
      </p>
    ) : (
      <ul id={listId} role="listbox" aria-labelledby={labelId}>
        {filtered.map((option, index) => {
          const chosen = option.code === value;
          return (
            <li key={option.code} role="presentation">
              <button
                type="button"
                role="option"
                id={`${listId}-${option.code}`}
                aria-selected={chosen}
                onClick={() => choose(option.code)}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-2 px-4 text-start text-search ${focusRing} ${
                  index === active ? "bg-primary-200" : ""
                }`}
              >
                <Flag code={option.code} />
                <span className="min-w-0 flex-1">{option.name}</span>
                {chosen ? (
                  <span className="size-4 shrink-0" aria-hidden="true">
                    <CheckIcon />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div ref={rootRef} className="relative flex flex-col gap-2">
      <span id={labelId} className="text-body font-medium">
        {label}
      </span>
      {open && !mobile ? (
        <input
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={
            filtered[active] ? `${listId}-${filtered[active].code}` : undefined
          }
          aria-labelledby={labelId}
          autoFocus
          value={query}
          placeholder={selected?.name ?? t("settings.countryPlaceholder")}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onInputKey}
          className={`${field} placeholder:text-text-muted ${focusRing}`}
        />
      ) : (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          onClick={() => (open ? setOpen(false) : openList())}
          className={`${field} cursor-pointer ${focusRing}`}
        >
          {selected ? (
            <>
              <Flag code={selected.code} />
              <span className="min-w-0 flex-1 truncate">{selected.name}</span>
            </>
          ) : (
            <span className="min-w-0 flex-1 text-text-muted">
              {t("settings.countryPlaceholder")}
            </span>
          )}
          <ChevronIcon className="size-4.5 shrink-0" />
        </button>
      )}
      {open && !mobile ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-control border border-border-strong bg-surface-field">
          {list}
        </div>
      ) : null}
      {open && mobile ? (
        <div className="fixed inset-0 z-40 flex items-end">
          <div
            className="absolute inset-0 bg-surface-inverse/40"
            onClick={close}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${labelId}-sheet`}
            className="relative flex max-h-dvh w-full flex-col gap-4 rounded-panel bg-surface-card p-6"
          >
            <h2 id={`${labelId}-sheet`} className="text-section font-bold">
              {label}
            </h2>
            <input
              autoFocus
              value={query}
              placeholder={t("settings.countrySearch")}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              aria-label={t("settings.countrySearch")}
              onKeyDown={onInputKey}
              className={`h-12 w-full rounded-control border border-border-strong bg-surface-field px-4 text-search placeholder:text-text-muted ${focusRing}`}
            />
            <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
