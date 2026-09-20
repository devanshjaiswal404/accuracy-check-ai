import React, { useState, useEffect } from "react";
import {
  Scan,
  Pill,
  FileText,
  Scale,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { PhysicalPackageScanner } from "@/components/PhysicalPackageScanner";
import { PharmaPricingAudit } from "@/components/PharmaPricingAudit";
import { EnforcementRegistryAnalytics } from "@/components/EnforcementRegistryAnalytics";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const t = {
  en: {
    appTitle: "MetrologyCheck AI — Legal Metrology & NPPA Enforcement",
    enforcementActive: "Enforcement Active: Central Zone",
    tabs: {
      physical: "Physical Package Scanner",
      pharma: "Pharma DPCO Audit",
      registry: "Enforcement Registry & Analytics",
    },
    workflow: {
      step1: "Select or Upload Packaging Specimen",
      step1Desc: "Drag & drop pack photo or capture via live device camera",
      step2: "AI Audits Statutory Rules & Stamping",
      step2Desc: "Checks MRP, Net Qty, USP, Inkjet & DPCO Ceiling in real time",
      step3: "Review Violations & Issue Form V Notice",
      step3Desc: "Verify bounding boxes and export court-ready legal seizure PDF",
    },
    toggleEn: "EN",
    toggleHi: "HI",
  },
  hi: {
    appTitle: "विधिक मापविज्ञान एवं एनपीपीए प्रवर्तन प्रणाली",
    enforcementActive: "प्रवर्तन सक्रिय: केंद्रीय क्षेत्र",
    tabs: {
      physical: "पैकेज सामग्री स्कैनर",
      pharma: "दवा मूल्य नियंत्रण (DPCO) जांच",
      registry: "निरीक्षण रिकॉर्ड और विश्लेषिकी",
    },
    workflow: {
      step1: "पैकेजिंग नमूना चुनें या अपलोड करें",
      step1Desc: "पैकेट का फोटो अपलोड करें या डिवाइस कैमरा से फोटो लें",
      step2: "एआई वैधानिक नियमों और स्टैम्पिंग की जांच करता है",
      step2Desc: "MRP, शुद्ध मात्रा, USP, इंकजेट व DPCO सीलिंग की तत्काल जांच",
      step3: "उल्लंघनों की समीक्षा करें और फॉर्म V नोटिस जारी करें",
      step3Desc: "बाउंडिंग बॉक्स सत्यापित करें और अदालत-योग्य जब्ती PDF निर्यात करें",
    },
    toggleEn: "EN",
    toggleHi: "HI",
  },
};

export function Index() {
  const { lang: globalLang, setLang: setGlobalLang } = useLang();
  const [language, setLanguageState] = useState<"en" | "hi">(
    globalLang === "hi" || globalLang === "en" ? globalLang : "en"
  );
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("mc-theme") as "dark" | "light") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("mc-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const setLanguage = (newLang: "en" | "hi") => {
    setLanguageState(newLang);
    if (setGlobalLang) {
      setGlobalLang(newLang);
    }
  };

  useEffect(() => {
    if (globalLang === "en" || globalLang === "hi") {
      setLanguageState(globalLang);
    }
  }, [globalLang]);

  const currentT = t[language];

  const [activeModule, setActiveModule] = useState<
    "physical-scanner" | "pharma-dpco" | "enforcement-registry"
  >("physical-scanner");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 1. Simplified & Clean Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 sm:p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-500/50">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100 sm:text-lg">
                {currentT.appTitle}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                {/* Sleek Live Status Chip with Glowing Green Dot */}
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  {currentT.enforcementActive}
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Theme Toggle & Language Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Sleek Sun / Moon Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 shadow-sm transition-all hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-600 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Polished Segmented Pill Language Toggle [ EN | HI ] */}
            <div
              className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-0.5 shadow-inner ring-1 ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:ring-slate-800/80"
              role="group"
              aria-label="Language Selector"
            >
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={cn(
                  "rounded-full px-3.5 py-1 font-display text-xs font-bold tracking-wider transition-all duration-150",
                  language === "en"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-500/50"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {currentT.toggleEn}
              </button>
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                className={cn(
                  "rounded-full px-3.5 py-1 font-display text-xs font-bold tracking-wider transition-all duration-150",
                  language === "hi"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-500/50"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {currentT.toggleHi}
              </button>
            </div>
          </div>
        </header>

        {/* 2. Soft Rounded Navigation Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-4">
          {/* Tab 1: Physical Package Scanner */}
          <button
            type="button"
            onClick={() => setActiveModule("physical-scanner")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
              activeModule === "physical-scanner"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-transparent"
                : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Scan className="h-4 w-4" />
            {currentT.tabs.physical}
          </button>

          {/* Tab 2: Pharma DPCO Audit */}
          <button
            type="button"
            onClick={() => setActiveModule("pharma-dpco")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
              activeModule === "pharma-dpco"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-transparent"
                : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Pill className="h-4 w-4" />
            {currentT.tabs.pharma}
          </button>

          {/* Tab 3: Enforcement Registry & Analytics */}
          <button
            type="button"
            onClick={() => setActiveModule("enforcement-registry")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
              activeModule === "enforcement-registry"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-transparent"
                : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <FileText className="h-4 w-4" />
            {currentT.tabs.registry}
          </button>
        </div>

        {/* 3. Guided "How it Works" 3-Step Onboarding Strip */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Step 1 */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-950/50">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800 font-display text-xs font-bold">
                1
              </div>
              <div className="min-w-0">
                <div className="font-display text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {currentT.workflow.step1}
                </div>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {currentT.workflow.step1Desc}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-950/50">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800 font-display text-xs font-bold">
                2
              </div>
              <div className="min-w-0">
                <div className="font-display text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {currentT.workflow.step2}
                </div>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {currentT.workflow.step2Desc}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-950/50">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800 font-display text-xs font-bold">
                3
              </div>
              <div className="min-w-0">
                <div className="font-display text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {currentT.workflow.step3}
                </div>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {currentT.workflow.step3Desc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Active Module View */}
        {activeModule === "physical-scanner" ? (
          <PhysicalPackageScanner />
        ) : activeModule === "pharma-dpco" ? (
          <PharmaPricingAudit />
        ) : (
          <EnforcementRegistryAnalytics />
        )}
      </div>
    </div>
  );
}

export default Index;
