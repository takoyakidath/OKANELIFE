"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Recharts' own `<ResponsiveContainer>` sizes itself purely from
 * ResizeObserver callbacks, which never fired in one of our test
 * environments (Playwright's sandboxed Chromium) even though the
 * container itself had a correct, non-zero layout size the whole time.
 * This measures synchronously via `getBoundingClientRect` on mount (which
 * doesn't depend on that callback ever firing) and only uses
 * ResizeObserver/`resize` as a best-effort update path afterwards.
 */
export function ChartFrame({
  height,
  label,
  children,
}: {
  height: number;
  /** Short description for assistive tech; the SVG itself isn't readable. */
  label: string;
  children: (width: number) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => setWidth(el.clientWidth);
    measure();

    window.addEventListener("resize", measure);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      observer.observe(el);
    }
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={ref} role="img" aria-label={label} style={{ height, width: "100%" }}>
      {width > 0 ? children(width) : null}
    </div>
  );
}
