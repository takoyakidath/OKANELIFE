"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";

export function BirthDateForm({ initialValue }: { initialValue: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    await apiClient.patch("/me", { birth_date: value || null });
    setStatus("saved");
    router.refresh();
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <Label htmlFor="birth-date">生年月日</Label>
        <Input
          id="birth-date"
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <Button type="submit" variant="outline" disabled={status === "saving"}>
        {status === "saving" && <Loader2 className="size-4 animate-spin" />}
        {status === "saved" && <Check className="size-4" />}
        保存
      </Button>
    </form>
  );
}
