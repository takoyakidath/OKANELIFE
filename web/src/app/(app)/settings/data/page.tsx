import { getExportJobs } from "@/lib/api-server";
import { ExportPanel } from "@/components/settings/export-panel";
import { ImportPanel } from "@/components/settings/import-panel";

export default async function DataSettingsPage() {
  const jobs = await getExportJobs();

  return (
    <div className="flex flex-col gap-8 py-6">
      <div>
        <h1 className="text-lg font-semibold">データ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          生涯利用を前提に、あなたのデータをいつでも取り出し、いつでも戻せます。
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">エクスポート</h2>
        <ExportPanel initialJobs={jobs} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">インポート（復元）</h2>
        <ImportPanel />
      </section>
    </div>
  );
}
