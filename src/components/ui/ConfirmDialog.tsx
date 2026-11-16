"use client";

import { Button } from "./Button";
import { useDialog } from "./useDialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * A confirmation. Desktop is a centred dialog; a narrow screen uses a bottom sheet.
 * Focus starts on the cancel button. Escape and the scrim cancel.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useDialog(open, onCancel);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:px-gutter">
      <div
        className="absolute inset-0 bg-surface-inverse/40"
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="relative flex w-full flex-col gap-5 rounded-panel bg-surface-card p-6 sm:max-w-dialog"
      >
        <div className="flex flex-col gap-2">
          <h2 id="confirm-title" className="text-section font-bold">
            {title}
          </h2>
          <p id="confirm-body" className="text-body text-text-muted">
            {body}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            data-autofocus
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} className="w-full sm:w-auto">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
