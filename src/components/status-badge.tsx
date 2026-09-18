import { ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { AuditStatus } from "@/lib/metrology";
import { cn } from "@/lib/utils";

const styles: Record<AuditStatus, { key: string; cls: string; dot: string }> = {
  COMPLIANT: { key: "status.compliant", cls: "border-pass/60 bg-pass-soft text-pass", dot: "bg-pass" },
  "NON-COMPLIANT": { key: "status.noncompliant", cls: "border-fail/60 bg-fail-soft text-fail", dot: "bg-fail" },
  REVIEW: { key: "status.review", cls: "border-warn/60 bg-warn-soft text-warn", dot: "bg-warn" },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: AuditStatus;
  size?: "sm" | "lg";
  className?: string;
}) {
  const { t } = useLang();
  const s = styles[status] ?? styles.REVIEW;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border font-display font-semibold uppercase tracking-widest",
        size === "lg" ? "px-4 py-2 text-xl" : "px-2.5 py-1 text-xs",
        s.cls,
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", s.dot)} />
      {t(s.key)}
    </span>
  );
}

export function OfficerChip({ className }: { className?: string }) {
  const { t } = useLang();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-pass" />
      {t("officer.badge")}
    </span>
  );
}
