"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";
import { NavItem } from "@/components/ui/NavItem";
import { focusRing } from "@/components/ui/styles";

type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Search field opened from the header. Submits to `/search`.
 * The results page is a later issue; this is only the dialog.
 */
export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const t = useTranslations();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    inputRef.current?.focus();
    document.body.classList.add("overflow-hidden");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled])",
        ),
      ];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("overflow-hidden");
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center px-gutter pt-20">
      <div
        className="absolute inset-0 bg-surface-inverse/40"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-search flex-col gap-2"
      >
        <form
          action="/search"
          method="get"
          className="order-2 flex items-center gap-5 rounded-control border-control border-primary-900 bg-surface-field p-field"
        >
          <label id={titleId} htmlFor={`${titleId}-q`} className="sr-only">
            {t("search.label")}
          </label>
          <input
            ref={inputRef}
            id={`${titleId}-q`}
            name="q"
            required
            maxLength={100}
            placeholder={t("search.placeholder")}
            className={`min-w-0 flex-1 bg-transparent px-2.5 text-input text-text-default placeholder:text-text-muted ${focusRing}`}
          />
          <Button type="submit">{t("search.submit")}</Button>
        </form>
        <div className="order-1 flex justify-end">
          <NavItem
            icon={<CloseIcon />}
            iconOnly
            label={t("search.close")}
            onClick={onClose}
            tooltipAlign="end"
          />
        </div>
      </div>
    </div>
  );
}
