import type { ReactElement } from "react";

/**
 * Shared glyph for every generated app icon (favicon, apple-touch-icon,
 * manifest PNGs). Generated at request/build time via `next/og`'s
 * ImageResponse so the repo doesn't need to ship binary image assets or
 * depend on an external icon generator.
 */
export function iconArt(size: number): ReactElement {
  const radius = Math.round(size * 0.22);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#c9713f",
        borderRadius: radius,
      }}
    >
      <span
        style={{
          fontSize: size * 0.58,
          fontWeight: 700,
          color: "#fdfaf5",
          fontFamily: "sans-serif",
          lineHeight: 1,
          transform: "translateY(-2%)",
        }}
      >
        ¥
      </span>
    </div>
  );
}
