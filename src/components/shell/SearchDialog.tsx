"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDialog } from "@/components/ui/useDialog";
import { SearchCombobox } from "@/components/search/SearchCombobox";

type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Search opened from the header. Full screen on a small screen, with
 * Cancel; a centred panel with an Esc hint on a larger screen.
 */
export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const t = useTranslations();
  const router = useRouter();

  function closeFromControl() {
    const state = window.history.state;
    if (isSearchEntry(state)) {
      window.history.back();
      return;
    }
    onClose();
  }

  function commit() {
    const state = window.history.state;
    if (isSearchEntry(state)) {
      window.history.replaceState({ ...state, couchSearch: false }, "");
    }
    onClose();
  }

  function openHref(href: string) {
    commit();
    router.push(href);
  }

  const dialogRef = useDialog(open, closeFromControl);

  useEffect(() => {
    if (!open) return;
    const state = window.history.state;
    if (!isSearchEntry(state)) {
      const base =
        typeof state === "object" && state !== null ? { ...state } : {};
      window.history.pushState({ ...base, couchSearch: true }, "");
    }

    function onPop() {
      onClose();
    }

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid md:px-gutter md:pt-24 md:pb-6">
      <button
        type="button"
        aria-label={t("search.close")}
        onClick={closeFromControl}
        className="absolute inset-0 hidden bg-surface-inverse/55 md:block"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("search.label")}
        className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-primary-100 md:h-auto md:max-h-full md:max-w-search md:justify-self-center md:self-start md:rounded-xl md:border md:border-border-default md:shadow-toast"
      >
        <SearchCombobox
          variant="modal"
          onDismiss={closeFromControl}
          onCommit={commit}
          onOpenHref={openHref}
        />
      </div>
    </div>
  );
}

function isSearchEntry(state: unknown): state is { couchSearch: true } {
  return (
    typeof state === "object" &&
    state !== null &&
    "couchSearch" in state &&
    state.couchSearch === true
  );
}
