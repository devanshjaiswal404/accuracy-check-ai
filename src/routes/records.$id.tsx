import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileDown, ShieldAlert } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { getInspection } from "@/lib/inspections.functions";
import { useLang } from "@/lib/i18n";
import type { AuditStatus } from "@/lib/metrology";
import { buildNoticePdf } from "@/lib/pdf";

export const Route = createFileRoute("/records/$id")({
  head: ({ match }) => {
    const name =
      (match.loaderData as { product: { product_name: string } | null } | null | undefined)?.product
        ?.product_name ?? "Inspection Audit";
    return {
      meta: [
        { title: `MetrologyCheck AI — ${name}` },
        {
          name: "description",
          content: "Statutory audit record with clause-level violations, extracted text and remediation.",
        },
        { property: "og:title", content: `MetrologyCheck AI — ${name}` },
        {
          property: "og:description",
          content: "Statutory audit record with clause-level violations, extracted text and remediation.",
        },
        { property: "og:type", content: "website" },
      ],
    };
  },
  loader: ({ params }) => getInspection({ data: { id: params.id } }),
  component: AuditDetail,
  notFoundComponent: () => <NotFoundBody />,
  errorComponent: () => <NotFoundBody />,
});

function NotFoundBody() {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">{t("detail.notfound")}</p>
      <Link
        to="/records"
        className="mt-6 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.back")}
      </Link>
    </div>
  );
}

function AuditDetail() {
  const { t } = useLang();
  const data = Route.useLoaderData();

  if (!data?.product) return <NotFoundBody />;

  const { product, violations } = data;
  const status = (product.status as AuditStatus) ?? "REVIEW";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link
        to="/records"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.back")}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
          ) : null}
          <div>
            <div className="font-display text-xl font-semibold uppercase tracking-wide text-foreground">
              {product.product_name}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {product.brand_name ?? "—"} · {product.category ?? "General"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {product.created_at
                ? new Date(product.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                : ""}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <StatusBadge status={status} size="lg" />
          <button
            type="button"
            onClick={() =>
              buildNoticePdf({
                productName: product.product_name,
                brand: product.brand_name ?? "",
                category: product.category ?? "",
                status,
                officer: "Officer Devansh · Zone 1",
                violations,
              })
            }
            className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <FileDown className="h-4 w-4" />
            {t("action.pdf")}
          </button>
        </div>
      </div>

      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {t("detail.audit")}
      </h2>

      {violations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {status === "COMPLIANT" ? t("status.compliant") : t("status.review")} · 0 {t("records.violations")}
        </div>
      ) : (
        <div className="space-y-3">
          {violations.map((v) => (
            <div key={v.id} className="rounded-lg border border-fail/40 bg-fail-soft/40 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[11px] text-muted-foreground">{v.rule_clause}</span>
                <span className="flex-1 text-sm font-medium text-foreground">{v.violation_title}</span>
                {v.severity && (
                  <span className="rounded border border-fail/50 bg-fail-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-fail">
                    {v.severity}
                  </span>
                )}
              </div>
              {v.extracted_text && (
                <p className="mt-2 break-words rounded bg-muted p-2 font-mono text-xs text-foreground">
                  <span className="text-muted-foreground">{t("audit.extracted")}: </span>
                  {v.extracted_text}
                </p>
              )}
              {v.remediation && (
                <p className="mt-2 text-xs text-warn">
                  <span className="font-semibold">{t("audit.remediation")}: </span>
                  {v.remediation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
