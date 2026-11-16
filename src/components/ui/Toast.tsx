"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CheckIcon } from "./icons";

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

type ToastState = {
  id: number;
  message: string;
  shown: boolean;
};

/**
 * One confirmation at a time, centred at the bottom of the viewport.
 * Call `showToast` with an already translated message ("Saved", "Link copied").
 * A sticky bar can set `--toast-clearance` so the toast sits above it.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message, shown: false });
  }, []);

  const toastId = toast?.id;

  useEffect(() => {
    if (toastId === undefined) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fade = reduce ? 0 : 200;
    const frame = window.requestAnimationFrame(() => {
      setToast((current) =>
        current && current.id === toastId
          ? { ...current, shown: true }
          : current,
      );
    });
    const hide = window.setTimeout(() => {
      setToast((current) =>
        current && current.id === toastId
          ? { ...current, shown: false }
          : current,
      );
    }, 3000);
    const remove = window.setTimeout(() => {
      setToast((current) => (current && current.id === toastId ? null : current));
    }, 3000 + fade);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hide);
      window.clearTimeout(remove);
    };
  }, [toastId]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-anchor" role="status">
        {toast ? (
          <div className="toast" data-shown={toast.shown ? "true" : "false"}>
            <span className="size-4 shrink-0" aria-hidden="true">
              <CheckIcon />
            </span>
            <p>{toast.message}</p>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
