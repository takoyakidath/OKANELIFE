"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, BarChart3, Settings, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { QuickAddSheet } from "@/components/income/quick-add-sheet";

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

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-card/80">
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

      <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
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
      className={cn(
        "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}
