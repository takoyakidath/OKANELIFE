import { WifiOff } from "lucide-react";

// Precached by the service worker and served whenever a full page
// navigation fails while offline (see src/app/sw.ts). Deliberately static
// and auth-free — see docs/DESIGN.md §7 for why OKANELIFE keeps offline
// support to "read cached, don't lose data" rather than an offline queue.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <WifiOff className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">オフラインです</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          このページはまだ読み込まれていません。電波の良い場所でもう一度開くと表示されます。
          収入の記録はオンラインに戻ってから行えます。
        </p>
      </div>
    </main>
  );
}
