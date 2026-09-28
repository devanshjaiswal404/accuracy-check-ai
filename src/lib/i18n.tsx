import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";

type Entry = { en: string; hi: string };

const dict: Record<string, Entry> = {
  "app.title": { en: "SatyaMaap 360", hi: "सत्यमाप 360" },
  "app.tagline": {
    en: "National Weighing & Measuring Instruments Verification Portal",
    hi: "राष्ट्रीय तौल एवं माप उपकरण सत्यापन एवं जीवनचक्र पोर्टल",
  },
  "app.division": {
    en: "Legal Metrology Division · Section 24",
    hi: "विधिक मापविज्ञान प्रभाग · धारा 24",
  },
  "officer.badge": { en: "Officer Devansh · Zone 1", hi: "अधिकारी देवांश · क्षेत्र 1" },
  "trader.badge": { en: "Trader Portal Active", hi: "व्यापारी पोर्टल सक्रिय" },
  "nav.trader": { en: "Trader e-Filing & Onboarding", hi: "व्यापारी ई-फाइलिंग व पंजीकरण" },
  "nav.lmo": { en: "Field LMO Testing Console", hi: "फील्ड अधिकारी (LMO) परीक्षण कंसोल" },
  "nav.registry": { en: "National Lifecycle Registry", hi: "राष्ट्रीय जीवनचक्र रजिस्टर" },

  // MPE & Metrology concepts
  "metrology.act": { en: "Legal Metrology Act, 2009", hi: "विधिक मापविज्ञान अधिनियम, 2009" },
  "metrology.sec24": { en: "Section 24: Verification & Stamping", hi: "धारा 24: सत्यापन एवं मुद्रांकन" },
  "metrology.mpe": { en: "Maximum Permissible Error (MPE)", hi: "अधिकतम स्वीकार्य त्रुटि (MPE)" },
  "metrology.accuracyClass": { en: "Accuracy Class", hi: "यथार्थता वर्ग" },
  "metrology.verificationInterval": { en: "Verification Scale Interval (e)", hi: "सत्यापन माप अंतराल (e)" },
  "metrology.scaleInterval": { en: "Actual Scale Interval (d)", hi: "वास्तविक माप अंतराल (d)" },
  "metrology.maxCapacity": { en: "Max Capacity (Max)", hi: "अधिकतम क्षमता (Max)" },
  "metrology.minCapacity": { en: "Min Capacity (Min)", hi: "न्यूनतम क्षमता (Min)" },
  "metrology.leadSeal": { en: "Physical Lead Seal No.", hi: "सीसा सील संख्या" },
  "metrology.hologram": { en: "Security Hologram ID", hi: "सुरक्षा होलोग्राम आईडी" },
  "metrology.certificate": { en: "Verification Certificate", hi: "सत्यापन प्रमाण पत्र" },
  
  // Statuses
  "status.verified": { en: "VERIFIED & STAMPED", hi: "सत्यापित एवं मुद्रांकित" },
  "status.rejected": { en: "REJECTED (TOLERANCE EXCEEDED)", hi: "अस्वीकृत (त्रुटि सीमा से अधिक)" },
  "status.pending": { en: "PENDING FIELD INSPECTION", hi: "फील्ड निरीक्षण लंबित" },
  "status.expired": { en: "VERIFICATION EXPIRED", hi: "सत्यापन समाप्त" },

  // Actions
  "action.downloadCert": { en: "Download Sec 24 Certificate", hi: "धारा 24 प्रमाण पत्र डाउनलोड करें" },
  "action.runTest": { en: "Evaluate MPE & Record Test", hi: "MPE मूल्यांकन करें व दर्ज करें" },
  "action.submitApplication": { en: "Submit for Verification", hi: "सत्यापन हेतु आवेदन जमा करें" },
  "action.saveInspection": { en: "Save & Issue Seal", hi: "सहेजें एवं सील जारी करें" },

  // Records / Registry
  "records.title": { en: "Instrument Verification Registry", hi: "उपकरण सत्यापन रजिस्टर" },
  "records.search": { en: "Search serial number, trader, or license…", hi: "सीरियल नंबर, व्यापारी या लाइसेंस खोजें…" },
  "records.all": { en: "All Instruments", hi: "सभी उपकरण" },
  "records.loading": { en: "Loading registry…", hi: "रजिस्टर लोड हो रहा है…" },
  "records.empty": { en: "No instruments found in registry.", hi: "रजिस्टर में कोई उपकरण नहीं मिला।" },
};

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("sm-lang");
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("sm-lang", l);
  };

  const t = (key: string) => dict[key]?.[lang] ?? dict[key]?.en ?? key;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
