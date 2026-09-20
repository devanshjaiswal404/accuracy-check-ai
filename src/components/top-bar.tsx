import { Link } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { OfficerChip } from "@/components/status-badge";
import { useLang } from "@/lib/i18n";

export function TopBar() {
  const { t } = useLang();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Logo & Division Title */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-base font-bold uppercase tracking-[0.14em] text-slate-900 dark:text-slate-100 sm:text-lg">
              METROLOGYCHECK AI
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t("app.division")}
            </div>
          </div>
        </Link>

        {/* Right: Officer Badge only */}
        <div className="flex items-center gap-2">
          <OfficerChip className="inline-flex" />
        </div>
      </div>
    </header>
  );
}

export default TopBar;
