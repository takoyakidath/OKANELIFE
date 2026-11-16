"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, BarChart3, Settings, Plus } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { QuickAddSheet } from "@/components/income/quick-add-sheet";
import { MilestoneToast } from "@/components/nav/milestone-toast";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/timeline", label: "タイムライン", icon: History },
];
const NAV_ITEMS_RIGHT = [
  { href: "/analysis", label: "分析", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  return (
    <>
      <nav aria-label="メインメニュー" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              aria-label="収入を記録"
              className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              <Plus className="size-6" />
            </button>
          </div>

          {NAV_ITEMS_RIGHT.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      </nav>

      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onMilestone={setToast}
      />
      <MilestoneToast message={toast} onDismiss={dismissToast} />
    </>
  );
}

function NavLink({
  item,
  active,
}: {
  item: { href: string; label: string; icon: typeof Home };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="size-5" aria-hidden />
      {item.label}
    </Link>
  );
}
