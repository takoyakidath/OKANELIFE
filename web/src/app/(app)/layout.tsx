import { requireSession } from "@/lib/auth-server";
import { BottomNav } from "@/components/nav/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pt-safe">{children}</div>
      <BottomNav />
    </div>
  );
}
