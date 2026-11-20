"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { CopyIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";

const COPIED_MS = 3000;

/** Copies the canonical title URL, with its slug and without the view query. */
export function CopyLink({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  const t = useTranslations();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function onCopy() {
    const url = new URL(path, window.location.origin).href;
    if (!(await copyText(url))) return;
    showToast(t("toast.linkCopied"));
    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <Button
      variant="secondary"
      size="small"
      icon={<CopyIcon />}
      onClick={() => void onCopy()}
      className={className}
    >
      {copied ? t("title.copied") : t("title.copy")}
    </Button>
  );
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // The selection fallback covers a denied Clipboard API.
  }

  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.readOnly = true;
    field.className = "sr-only";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  } catch {
    return false;
  }
}
