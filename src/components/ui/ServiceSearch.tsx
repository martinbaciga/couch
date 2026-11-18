"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { containsFolded } from "@/lib/text";
import { CloseIcon } from "./icons";
import { ServiceOption } from "./ServiceOption";
import { focusRing } from "./styles";

export type SearchableService = {
  id: number;
  name: string;
  src: string | null;
};

type ServiceSearchProps = {
  services: readonly SearchableService[];
  selectedIds: readonly number[];
  onToggle: (id: number) => void;
};

/** Filters the catalogue as you type and lists matches as service options. */
export function ServiceSearch({
  services,
  selectedIds,
  onToggle,
}: ServiceSearchProps) {
  const t = useTranslations();
  const labelId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outsidePointer = useRef(false);
  const [query, setQuery] = useState("");
  const needle = query.trim();

  useEffect(() => {
    // Closing the country list removes its focused input, and the browser
    // then moves focus to this field. A click that did not land here is rejected.
    function onPointerDown(event: PointerEvent) {
      const field = fieldRef.current;
      const input = inputRef.current;
      const target = event.target;
      const inside =
        field !== null &&
        target instanceof Node &&
        (target === field || field.contains(target));
      outsidePointer.current = !inside;
      if (!inside && document.activeElement === input) input?.blur();
      if (!inside) {
        window.setTimeout(() => {
          outsidePointer.current = false;
        }, 0);
      }
    }
    function onFocusIn(event: FocusEvent) {
      const input = inputRef.current;
      if (!input || event.target !== input || !outsidePointer.current) return;
      outsidePointer.current = false;
      input.blur();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") outsidePointer.current = false;
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  const matches = needle
    ? services.filter((service) => containsFolded(service.name, needle))
    : [];

  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-body font-medium">
        {t("settings.find")}
      </p>
      <div
        ref={fieldRef}
        className="field-focus relative flex h-12 items-center rounded-control border-control border-border-strong bg-surface-field"
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          outsidePointer.current = false;
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          aria-labelledby={labelId}
          value={query}
          placeholder={t("settings.findPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
          className={`h-full min-w-0 flex-1 bg-transparent px-4 text-search text-text-default outline-none placeholder:text-text-muted ${
            query ? "pe-12" : ""
          }`}
        />
        {query ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setQuery("")}
            aria-label={t("settings.clearSearch")}
            className={`absolute end-0.5 top-0.5 inline-flex size-11 cursor-pointer items-center justify-center text-text-default ${focusRing}`}
          >
            <span className="size-5" aria-hidden="true">
              <CloseIcon />
            </span>
          </button>
        ) : null}
      </div>
      {needle && matches.length === 0 ? (
        <p className="text-body text-text-muted">
          {t("settings.noService", { query: needle })}
        </p>
      ) : null}
      {matches.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
          {matches.map((service) => (
            <li key={service.id}>
              <ServiceOption
                name={service.name}
                src={service.src}
                selected={selectedIds.includes(service.id)}
                onToggle={() => onToggle(service.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-body text-text-muted">{t("settings.planNote")}</p>
    </div>
  );
}
