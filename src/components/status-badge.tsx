import { ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { VerificationStatus } from "@/types/metrology";
import { cn } from "@/lib/utils";

const styles: Record<VerificationStatus | string, { label: string; cls: string; dot: string }> = {
  VERIFIED: { label: "VERIFIED & STAMPED", cls: "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  REJECTED: { label: "REJECTED (TOLERANCE BREACH)", cls: "border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
  PENDING_INSPECTION: { label: "PENDING INSPECTION", cls: "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  EXPIRED: { label: "STAMPING EXPIRED", cls: "border-slate-500/60 bg-slate-500/10 text-slate-600 dark:text-slate-400", dot: "bg-slate-500" },
  COMPLIANT: { label: "COMPLIANT", cls: "border-emerald-500/60 bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" },
  "NON-COMPLIANT": { label: "NON-COMPLIANT", cls: "border-rose-500/60 bg-rose-500/10 text-rose-600", dot: "bg-rose-500" },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: VerificationStatus | string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const s = styles[status] ?? styles.PENDING_INSPECTION;
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
      {s.label}
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
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
      {t("officer.badge")}
    </span>
  );
}
