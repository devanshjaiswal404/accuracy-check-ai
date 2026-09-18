import { Link, useRouterState } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { OfficerChip } from "@/components/status-badge";
import { useLang, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function LangToggle() {
  const { lang, setLang } = useLang();
  const opts: { id: Lang; label: string }[] = [
    { id: "en", label: "EN" },
    { id: "hi", label: "हिं" },
  ];
  return (
    <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Language">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={lang === o.id}
          onClick={() => setLang(o.id)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium transition-colors",
            lang === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TopBar() {
  const { t } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname.startsWith("/records") ? "records" : "inspection";

  const tabs: { id: string; to: string; label: string; exact?: boolean }[] = [
    { id: "inspection", to: "/", label: t("nav.inspection"), exact: true },
    { id: "records", to: "/records", label: t("nav.registry") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold uppercase leading-none tracking-[0.14em] text-foreground">
              MetrologyCheck AI
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("app.division")}
            </div>
          </div>
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <OfficerChip className="hidden md:inline-flex" />
          <LangToggle />
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.to}
                activeOptions={tab.exact ? { exact: true } : {}}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  active === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
