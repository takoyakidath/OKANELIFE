"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import type { ExportJob } from "@/lib/types";

const STATUS_LABEL: Record<ExportJob["status"], string> = {
  pending: "準備中…",
  processing: "データを書き出し中…",
  completed: "完了",
  failed: "失敗しました",
};

export function ExportPanel({ initialJobs }: { initialJobs: ExportJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "pending" || j.status === "processing");
    if (!hasActive) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const latest = await apiClient.get<ExportJob[]>("/exports");
      setJobs(latest);
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobs]);

  async function startExport() {
    setStarting(true);
    try {
      const job = await apiClient.post<ExportJob>("/exports");
      setJobs((prev) => [job, ...prev]);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        あなたのすべてのデータを、いつでもZIPファイルとして書き出せます。サービスが終わっても、あなたのデータはあなたのものです。
      </p>
      <Button onClick={startExport} disabled={starting} className="self-start">
        {starting && <Loader2 className="size-4 animate-spin" />}
        エクスポートを開始
      </Button>

      {jobs.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {jobs.map((job) => (
            <div key={job.uuid} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{STATUS_LABEL[job.status]}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(job.created_at).toLocaleString("ja-JP")}
                </p>
              </div>
              {job.status === "completed" && job.download_url && (
                <a
                  href={job.download_url}
                  className="flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm font-medium"
                >
                  <Download className="size-3.5" />
                  ダウンロード
                </a>
              )}
              {(job.status === "pending" || job.status === "processing") && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
