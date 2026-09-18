import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/status-badge";
import { listInspections } from "@/lib/inspections.functions";
import { useLang } from "@/lib/i18n";
import type { AuditStatus } from "@/lib/metrology";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "MetrologyCheck AI — Registry Records" },
      {
        name: "description",
        content: "Searchable repository of past Legal Metrology pack inspections and their statutory outcomes.",
      },
      { property: "og:title", content: "MetrologyCheck AI — Registry Records" },
      {
        property: "og:description",
        content: "Searchable repository of past Legal Metrology pack inspections and their statutory outcomes.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RecordsPage,
});

type ProductRow = Tables<"inspected_products">;
type StatusFilter = "ALL" | AuditStatus;

function RecordsPage() {
  const { t } = useLang();
  const listFn = useServerFn(listInspections);
  const { data, isLoading, error } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => listFn(),
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const rows = useMemo(() => {
    let list = (data ?? []) as ProductRow[];
    if (status !== "ALL") list = list.filter((r) => (r.status ?? "REVIEW") === status);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.product_name.toLowerCase().includes(q) ||
          (r.brand_name ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, search, status]);

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "ALL", label: t("records.all") },
    { id: "COMPLIANT", label: t("status.compliant") },
    { id: "NON-COMPLIANT", label: t("status.noncompliant") },
    { id: "REVIEW", label: t("status.review") },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold uppercase tracking-widest text-foreground">
          {t("records.title")}
        </h1>
        <span className="text-xs text-muted-foreground">
          {rows.length} {t("records.count")}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("records.search")}
            className="w-72 rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatus(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                status === f.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          {t("records.loading")}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-fail/50 bg-fail-soft p-8 text-center text-sm text-fail">
          {(error as Error).message}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {t("records.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("records.product")}</th>
                <th className="px-4 py-3 font-medium">{t("records.brand")}</th>
                <th className="px-4 py-3 font-medium">{t("records.date")}</th>
                <th className="px-4 py-3 font-medium">{t("records.status")}</th>
                <th className="px-4 py-3 font-medium">{t("records.violations")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("records.action")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.image_url ? (
                        <img src={r.image_url} alt="" className="h-9 w-9 rounded border border-border object-cover" />
                      ) : null}
                      <span className="font-medium text-foreground">{r.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.brand_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={(r.status as AuditStatus) ?? "REVIEW"} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("font-display text-lg font-semibold", (r.total_violations ?? 0) > 0 ? "text-fail" : "text-pass")}>
                      {r.total_violations ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/records/$id"
                      params={{ id: r.id }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      {t("records.view")}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
