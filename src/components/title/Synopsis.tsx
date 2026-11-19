"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

const COLLAPSED_LINES = 4;
/* Past the 240ms expand, so a missing transitionend still restores the ellipsis. */
const ELLIPSIS_FALLBACK_MS = 320;

/**
 * Four-line synopsis with an inline toggle when the text is actually cut off.
 * The full string stays in the DOM. Line clamping only hides it visually.
 * State resets when the text changes, and when the page unmounts the component.
 */
export function Synopsis({ text }: { text: string }) {
  const t = useTranslations();
  const textId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamp, setClamp] = useState(true);
  const [overflows, setOverflows] = useState(false);
  const [trackedText, setTrackedText] = useState(text);

  if (text !== trackedText) {
    setTrackedText(text);
    setExpanded(false);
    setClamp(true);
    setOverflows(false);
  }

  useLayoutEffect(() => {
    const textEl = textRef.current;
    if (!textEl) return;

    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(textEl).lineHeight);
      const collapsedHeight =
        Number.isFinite(lineHeight) && lineHeight > 0
          ? lineHeight * COLLAPSED_LINES
          : textEl.clientHeight;
      // Clamped: scrollHeight against the visible box. Expanded: against the
      // four-line height, because the box has grown to the full paragraph.
      const limit = clamp ? textEl.clientHeight : collapsedHeight;
      setOverflows(textEl.scrollHeight > limit);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(textEl);
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [clamp, text]);

  useEffect(() => {
    if (expanded || clamp) return;
    const frame = frameRef.current;
    if (!frame) return;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setClamp(true);
    };
    const onEnd = (event: TransitionEvent) => {
      if (
        event.target === frame &&
        event.propertyName === "grid-template-rows"
      ) {
        settle();
      }
    };

    frame.addEventListener("transitionend", onEnd);
    const timeout = window.setTimeout(settle, ELLIPSIS_FALLBACK_MS);
    return () => {
      frame.removeEventListener("transitionend", onEnd);
      window.clearTimeout(timeout);
    };
  }, [expanded, clamp]);

  function onToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      setClamp(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setClamp(true);
    }
  }

  return (
    <>
      <div
        ref={frameRef}
        className="synopsis-reveal"
        data-overflow={overflows ? "true" : undefined}
        data-expanded={expanded ? "true" : undefined}
      >
        <div className="synopsis-reveal-body">
          <p
            ref={textRef}
            id={textId}
            className={`text-small text-text-default${clamp ? " line-clamp-4" : ""}`}
          >
            {text}
          </p>
        </div>
      </div>
      {overflows ? (
        <Button
          variant="link"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={onToggle}
          className="-my-3 self-start"
        >
          {expanded ? t("title.showLess") : t("title.readMore")}
        </Button>
      ) : null}
    </>
  );
}
