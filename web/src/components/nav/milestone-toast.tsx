"use client";

import { useEffect } from "react";
import { Trophy } from "lucide-react";

const DISMISS_AFTER_MS = 5000;

/** Quiet, single-line notice for a freshly achieved milestone. Deliberately no
 * animation or confetti — see docs/DESIGN.md §7 ("過剰にゲーム化しない"). */
export function MilestoneToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="pointer-events-auto flex min-h-11 max-w-sm items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-card-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trophy className="size-4 shrink-0 text-primary" aria-hidden />
        <span>{message}</span>
      </button>
    </div>
  );
}
