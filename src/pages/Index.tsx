import React, { useState, useEffect } from "react";
import {
  Scale,
  Building,
  Crosshair,
  Layers,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  Award,
} from "lucide-react";
import { TraderPortal } from "@/components/instruments/TraderPortal";
import { FieldLMOConsole } from "@/components/instruments/FieldLMOConsole";
import { InstrumentLifecycleRegistry } from "@/components/instruments/InstrumentLifecycleRegistry";
import { CertificateView } from "@/components/instruments/CertificateView";
import type { InstrumentSpecs, InspectionSession } from "@/types/metrology";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/supabaseClient";

const DEFAULT_INITIAL_INSTRUMENT: InstrumentSpecs = {
  id: 'inst-live-01',
  applicationNo: 'SM360-2026-DEL-0891',
  traderName: 'Rajesh Kumar Gupta',
  businessName: 'Gupta Kirana & General Merchant',
  tradeLicenseNo: 'DL-MCD-2024-99812',
  address: 'Shop No. 14, Main Market, Lajpat Nagar II',
  district: 'South East Delhi',
  state: 'Delhi',
  pincode: '110024',
  instrumentType: 'ELECTRONIC_COUNTER_SCALE',
  make: 'Essae-Teraoka',
  model: 'DS-215N',
  serialNumber: 'ES-2026-884129',
  modelApprovalNo: 'IND/09/2021/412',
  accuracyClass: 'CLASS_III',
  maxCapacity: 30,
  minCapacity: 0.1,
  verificationInterval_e: 0.005,
  scaleInterval_d: 0.005,
  unit: 'kg',
  verificationFee: 200,
};

const DEFAULT_INITIAL_CERTIFICATE: InspectionSession = {
  instrument: DEFAULT_INITIAL_INSTRUMENT,
  officerName: 'Devansh Jaiswal',
  officerBadge: 'LMO-DL-CENTRAL-042',
  jurisdictionZone: 'Delhi Zone-1 (South East)',
  verificationType: 'PERIODIC_REVERIFICATION',
  inspectionDate: new Date().toISOString().split('T')[0],
  nextDueDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  physicalConditionOk: true,
  modelPlatePresent: true,
  sealingProvisionIntact: true,
  eccentricityTests: [],
  repeatabilityTests: [],
  linearityTests: [],
  overallStatus: 'VERIFIED',
  leadSealNumber: 'IND-DL-26-LS-89410',
  hologramNumber: 'HG-2026-99124',
  certificateNumber: 'LM/DL/SEC24/2026/04812',
  stampingFeePaid: 200,
};

const t = {
  en: {
    appTitle: "SatyaMaap 360 — Weights & Measures Lifecycle Management",
    enforcementActive: "Section 24 Statutory Verification: Active",
    tabs: {
      trader: "Trader e-Filing & Onboarding",
      lmo: "Field LMO Testing Console",
      registry: "Instrument Lifecycle Registry",
      certificate: "Digital Certificate (DVC)",
    },
    toggleEn: "EN",
    toggleHi: "HI",
  },
  hi: {
    appTitle: "सत्यमाप 360 — तौल एवं माप उपकरण जीवनचक्र प्रबंधन",
    enforcementActive: "धारा 24 सांविधिक सत्यापन: सक्रिय",
    tabs: {
      trader: "व्यापारी ई-फाइलिंग व पंजीकरण",
      lmo: "फील्ड LMO परीक्षण कंसोल",
      registry: "उपकरण जीवनचक्र रजिस्टर",
      certificate: "डिजिटल प्रमाण पत्र (DVC)",
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

  const [activeModule, setActiveModule] = useState<
    "trader-onboarding" | "lmo-console" | "lifecycle-registry" | "certificate-view"
  >("lmo-console");

  // Registry state
  const [instruments, setInstruments] = useState<InstrumentSpecs[]>([DEFAULT_INITIAL_INSTRUMENT]);
  const [sessions, setSessions] = useState<InspectionSession[]>([DEFAULT_INITIAL_CERTIFICATE]);
  const [selectedForInspection, setSelectedForInspection] = useState<InstrumentSpecs | null>(
    DEFAULT_INITIAL_INSTRUMENT
  );
  const [activeCertSession, setActiveCertSession] = useState<InspectionSession>(DEFAULT_INITIAL_CERTIFICATE);

  // Live database fetch from Supabase
  useEffect(() => {
    async function loadLiveSupabaseData() {
      try {
        // Fetch registered instruments
        const { data: instData } = await supabase
          .from("instruments")
          .select("*")
          .order("created_at", { ascending: false });

        if (instData && instData.length > 0) {
          const mappedInst: InstrumentSpecs[] = instData.map((r) => ({
            id: r.id,
            applicationNo: `SM360-${r.serial_number}`,
            traderName: r.trader_name,
            businessName: r.business_name || `${r.trader_name} Firm`,
            tradeLicenseNo: r.trade_license_no || "DL-MCD-2025-REG",
            address: r.address || "Commercial Premises",
            district: r.district || "Delhi Central",
            state: r.state || "Delhi",
            pincode: r.pincode || "110001",
            instrumentType: (r.instrument_type as any) || "ELECTRONIC_COUNTER_SCALE",
            make: r.make || "Standard",
            model: r.model || "Scale-360",
            serialNumber: r.serial_number,
            modelApprovalNo: r.model_approval_no || "IND/01/2024/099",
            accuracyClass: (r.accuracy_class as any) || "CLASS_III",
            maxCapacity: Number(r.max_capacity) || 30,
            minCapacity: Number(r.min_capacity) || 0.1,
            verificationInterval_e: Number(r.verification_interval_e) || 0.005,
            scaleInterval_d: Number(r.scale_interval_d) || 0.005,
            unit: (r.unit as any) || "kg",
            verificationFee: Number(r.stamping_fee) || 200,
          }));
          setInstruments(mappedInst);
          setSelectedForInspection(mappedInst[0]);
        }

        // Fetch verified certificates
        const { data: certData } = await supabase
          .from("certificates")
          .select("*")
          .order("created_at", { ascending: false });

        if (certData && certData.length > 0) {
          const mappedCert: InspectionSession[] = certData.map((c) => ({
            instrument: {
              id: c.instrument_id,
              applicationNo: `SM360-${c.serial_number}`,
              traderName: c.trader_name,
              businessName: c.business_name || `${c.trader_name} Firm`,
              tradeLicenseNo: "DL-SEC24-LIC",
              address: "Commercial Premises",
              district: c.zone || "Central Delhi",
              state: "Delhi",
              pincode: "110001",
              instrumentType: "ELECTRONIC_COUNTER_SCALE",
              make: "Standard Certified",
              model: "SC-360",
              serialNumber: c.serial_number,
              modelApprovalNo: "IND/01/2024/099",
              accuracyClass: "CLASS_III",
              maxCapacity: 30,
              minCapacity: 0.1,
              verificationInterval_e: 0.005,
              scaleInterval_d: 0.005,
              unit: "kg",
              verificationFee: Number(c.stamping_fee_paid || 200),
            },
            officerName: c.inspector_name || "Devansh Jaiswal",
            officerBadge: c.inspector_badge || "LMO-DL-CENTRAL-042",
            jurisdictionZone: c.zone || "Delhi Zone-1",
            verificationType: "PERIODIC_REVERIFICATION",
            inspectionDate: c.approval_date,
            nextDueDate: c.expiry_date,
            physicalConditionOk: true,
            modelPlatePresent: true,
            sealingProvisionIntact: true,
            eccentricityTests: [],
            repeatabilityTests: [],
            linearityTests: [],
            overallStatus: (c.verification_status as any) || "VERIFIED",
            leadSealNumber: c.lead_seal_number,
            hologramNumber: c.hologram_number,
            certificateNumber: c.certificate_number,
            stampingFeePaid: Number(c.stamping_fee_paid || 200),
            sealImageUrl: c.seal_image_url,
            gpsCoordinates: c.gps_latitude && c.gps_longitude ? {
              latitude: Number(c.gps_latitude),
              longitude: Number(c.gps_longitude),
              accuracy: 10,
            } : undefined,
          }));
          setSessions(mappedCert);
          setActiveCertSession(mappedCert[0]);
        }
      } catch (err) {
        console.warn("Live Supabase fetch notice:", err);
      }
    }
    loadLiveSupabaseData();
  }, []);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("sm-theme") as "dark" | "light") || "dark";
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
    localStorage.setItem("sm-theme", nextTheme);
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

  // Callback when a trader registers an instrument
  const handleRegisterInstrument = (inst: InstrumentSpecs) => {
    setInstruments((prev) => [inst, ...prev]);
  };

  // Callback to transition directly from trader form to inspection
  const handleSendToInspection = (inst: InstrumentSpecs) => {
    setSelectedForInspection(inst);
    setActiveModule("lmo-console");
  };

  // Callback when inspection is stamped & certified
  const handleInspectionCompleted = (session: InspectionSession) => {
    setSessions((prev) => [session, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Bar */}
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

          {/* Theme & Language Controls */}
          <div className="flex items-center gap-2.5">
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

        {/* Navigation Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-4">
          {/* Tab 1: Field LMO Console */}
          <button
            type="button"
            onClick={() => setActiveModule("lmo-console")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
              activeModule === "lmo-console"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-transparent"
                : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Crosshair className="h-4 w-4" />
            {currentT.tabs.lmo}
          </button>

          {/* Tab 2: Trader e-Filing */}
          <button
            type="button"
            onClick={() => setActiveModule("trader-onboarding")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
              activeModule === "trader-onboarding"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-transparent"
                : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Building className="h-4 w-4" />
            {currentT.tabs.trader}
          </button>

          {/* Tab 3: Instrument Lifecycle Registry */}
          <button
            type="button"
            onClick={() => setActiveModule("lifecycle-registry")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
              activeModule === "lifecycle-registry"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-transparent"
                : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Layers className="h-4 w-4" />
            {currentT.tabs.registry}
          </button>

          {/* Tab 4: Digital Verification Certificate (DVC) */}
          <button
            type="button"
            onClick={() => setActiveModule("certificate-view")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
              activeModule === "certificate-view"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-transparent"
                : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Award className="h-4 w-4" />
            {currentT.tabs.certificate}
          </button>
        </div>

        {/* Tab Modules */}
        <div className="transition-opacity duration-200">
          {activeModule === "lmo-console" && (
            <FieldLMOConsole
              selectedInstrument={selectedForInspection}
              onInspectionCompleted={handleInspectionCompleted}
            />
          )}

          {activeModule === "trader-onboarding" && (
            <TraderPortal
              onRegisterInstrument={handleRegisterInstrument}
              onSendToInspection={handleSendToInspection}
            />
          )}

          {activeModule === "lifecycle-registry" && (
            <InstrumentLifecycleRegistry
              sessions={sessions}
              onOpenInspection={handleSendToInspection}
              onOpenFullCertificate={(session) => {
                setActiveCertSession(session);
                setActiveModule("certificate-view");
              }}
            />
          )}

          {activeModule === "certificate-view" && (
            <CertificateView
              session={activeCertSession || sessions[0] || INITIAL_INSPECTIONS[0]}
              onBack={() => setActiveModule("lifecycle-registry")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Index;
