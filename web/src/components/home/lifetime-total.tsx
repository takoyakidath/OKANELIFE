"use client";

import { useEffect, useState } from "react";

/** Counts up from 0 on first paint — the one deliberate flourish on the
 * home screen; the rest of the page stays calm. */
export function LifetimeTotal({ amount }: { amount: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(amount * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [amount]);

  return (
    <div className="flex flex-col items-center gap-1 py-2 text-center">
      <p className="text-sm font-medium text-muted-foreground">これまでに稼いだお金</p>
      <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
        ¥{display.toLocaleString("ja-JP")}
      </p>
    </div>
  );
}
