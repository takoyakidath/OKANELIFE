"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { apiClient } from "@/lib/api-client";

const CHOICES = [
  { key: "today", label: "今日から始める", destination: "/" },
  { key: "this_year", label: "今年から始める", destination: "/past" },
  { key: "past_year", label: "過去の年から入力する", destination: "/past" },
  { key: "first_income", label: "初めて収入を得た時点から入力する", destination: "/past" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function choose(choice: (typeof CHOICES)[number]) {
    setLoading(choice.key);
    try {
      await apiClient.patch("/me", {
        onboarding_completed: true,
        history_start_choice: choice.key,
      });
    } finally {
      router.push(choice.destination);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">過去の収入も記録しますか？</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          OKANELIFEは、今日からでも、10年前からでも始められます。
          あとから設定はいつでも変更できます。
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {CHOICES.map((choice) => (
          <button
            key={choice.key}
            onClick={() => choose(choice)}
            disabled={loading !== null}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent disabled:opacity-60"
          >
            {loading === choice.key && <Loader2 className="size-4 animate-spin" />}
            {choice.label}
          </button>
        ))}
      </div>
    </main>
  );
}
