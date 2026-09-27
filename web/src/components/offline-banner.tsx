"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("offline", callback);
  window.addEventListener("online", callback);
  return () => {
    window.removeEventListener("offline", callback);
    window.removeEventListener("online", callback);
  };
}

// Node's SSR runtime exposes a minimal global `navigator` (for
// `navigator.userAgent`) with no `onLine` property, so this must never be
// read during server rendering — getServerSnapshot always assumes online.
function getSnapshot() {
  return !navigator.onLine;
}
function getServerSnapshot() {
  return false;
}

export function OfflineBanner() {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground pt-safe"
    >
      <WifiOff className="size-3.5" />
      オフラインです。表示中の内容は最新でない場合があります。記録の保存はオンラインに戻ってから行えます。
    </div>
  );
}
