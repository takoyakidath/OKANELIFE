"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";

type PreviewResult = {
  preview_token: string;
  counts: { incomes: number; companies: number; events: number };
  duplicates: number;
  format_version: number;
  warnings: string[];
};

export function ImportPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [policy, setPolicy] = useState<"skip" | "overwrite">("skip");
  const [status, setStatus] = useState<"idle" | "previewing" | "importing" | "done" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("previewing");
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/imports/preview", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("preview_failed");
      const data = (await res.json()) as PreviewResult;
      setPreview(data);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("ファイルを確認できませんでした。OKANELIFEのエクスポートZIPを選択してください。");
    }
  }

  async function handleImport() {
    if (!preview) return;
    setStatus("importing");
    try {
      const res = await fetch("/api/v1/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview_token: preview.preview_token, policy }),
      });
      if (!res.ok) throw new Error("import_failed");
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
      setErrorMessage("復元に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        OKANELIFEからエクスポートしたZIPファイルを復元できます。復元前に、現在のデータは自動でバックアップされます。
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={status === "previewing" || status === "importing"}
        className="self-start"
      >
        {status === "previewing" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UploadCloud className="size-4" />
        )}
        ZIPファイルを選択
      </Button>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      {preview && status !== "done" && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">復元内容の確認</p>
          <ul className="text-sm text-muted-foreground">
            <li>収入: {preview.counts.incomes}件</li>
            <li>会社・組織: {preview.counts.companies}件</li>
            <li>できごと: {preview.counts.events}件</li>
            {preview.duplicates > 0 && <li>既存データと重複: {preview.duplicates}件</li>}
          </ul>
          {preview.warnings.length > 0 && (
            <ul className="text-xs text-destructive">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium">重複データの扱い</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPolicy("skip")}
                className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                  policy === "skip" ? "border-primary bg-primary/10 text-primary" : "border-input"
                }`}
              >
                スキップする
              </button>
              <button
                type="button"
                onClick={() => setPolicy("overwrite")}
                className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                  policy === "overwrite"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input"
                }`}
              >
                上書きする
              </button>
            </div>
          </div>

          <Button onClick={handleImport} disabled={status === "importing"}>
            {status === "importing" && <Loader2 className="size-4 animate-spin" />}
            この内容で復元する
          </Button>
        </div>
      )}

      {status === "done" && (
        <p className="text-sm text-success">復元が完了しました。</p>
      )}
    </div>
  );
}
