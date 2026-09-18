import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";

type Entry = { en: string; hi: string };

const dict: Record<string, Entry> = {
  "app.division": { en: "Legal Metrology Division", hi: "विधिक मापविज्ञान प्रभाग" },
  "officer.badge": { en: "Officer Devansh · Zone 1", hi: "अधिकारी देवांश · क्षेत्र 1" },
  "nav.inspection": { en: "New Inspection", hi: "नई जाँच" },
  "nav.registry": { en: "Registry Records", hi: "रजिस्टर अभिलेख" },
  "quick.title": {
    en: "Quick-test simulation",
    hi: "त्वरित-परीक्षण सिमुलेशन",
  },
  "quick.compliant": { en: "Load Compliant Sample", hi: "अनुपालन नमूना लोड करें" },
  "quick.noncompliant": { en: "Load Non-Compliant Sample", hi: "गैर-अनुपालन नमूना लोड करें" },
  "quick.reset": { en: "Reset", hi: "रीसेट" },
  "upload.title": { en: "Evidence Capture", hi: "साक्ष्य कैप्चर" },
  "upload.drop": { en: "Drop pack image here or browse", hi: "पैक की छवि यहाँ खींचें या चुनें" },
  "upload.formats": { en: "PNG or JPG · multi-angle supported", hi: "PNG या JPG · बहु-कोण समर्थित" },
  "upload.browse": { en: "Browse Files", hi: "फ़ाइल चुनें" },
  "upload.webcam": { en: "Capture from Webcam", hi: "वेबकैम से कैप्चर करें" },
  "upload.webcamStop": { en: "Stop Camera", hi: "कैमरा बंद करें" },
  "upload.snapshot": { en: "Take Snapshot", hi: "स्नैपशॉट लें" },
  "tabs.front": { en: "Front (PDP)", hi: "अगला भाग" },
  "tabs.back": { en: "Back Label", hi: "पिछला लेबल" },
  "tabs.panel": { en: "Ingredients / MRP Panel", hi: "सामग्री / MRP पैनल" },
  "tags.title": { en: "Detected text segments", hi: "पहचाने गए पाठ खंड" },
  "tags.pass": { en: "Pass tags", hi: "उत्तीर्ण टैग" },
  "tags.violation": { en: "Violation tags", hi: "उल्लंघन टैग" },
  "audit.title": { en: "Compliance Audit Engine", hi: "अनुपालन ऑडिट इंजन" },
  "audit.idle": {
    en: "Load a quick-test sample or capture a pack image to begin the statutory audit.",
    hi: "सांविधिक ऑडिट शुरू करने के लिए नमूना लोड करें या पैक की छवि कैप्चर करें।",
  },
  "status.compliant": { en: "COMPLIANT", hi: "अनुपालन" },
  "status.noncompliant": { en: "NON-COMPLIANT", hi: "गैर-अनुपालन" },
  "status.review": { en: "REVIEW REQUIRED", hi: "समीक्षा आवश्यक" },
  "audit.violations": { en: "Violations", hi: "उल्लंघन" },
  "audit.passed": { en: "Clauses passed", hi: "उत्तीर्ण धाराएँ" },
  "audit.review": { en: "Manual review", hi: "मैनुअल समीक्षा" },
  "audit.remediation": { en: "Remediation", hi: "निवारण" },
  "audit.extracted": { en: "Extracted", hi: "निकाला गया" },
  "action.save": { en: "Save Inspection", hi: "जाँच सहेजें" },
  "action.saving": { en: "Saving…", hi: "सहेज रहे हैं…" },
  "action.saved": { en: "Inspection saved to registry", hi: "जाँच रजिस्टर में सहेजी गई" },
  "action.pdf": { en: "Export Official PDF Notice", hi: "आधिकारिक PDF नोटिस निर्यात करें" },
  "records.title": { en: "Inspection Records Repository", hi: "जाँच अभिलेख कोष" },
  "records.search": { en: "Search product or brand…", hi: "उत्पाद या ब्रांड खोजें…" },
  "records.all": { en: "All", hi: "सभी" },
  "records.product": { en: "Product", hi: "उत्पाद" },
  "records.brand": { en: "Brand", hi: "ब्रांड" },
  "records.date": { en: "Scanned Date", hi: "जाँच तिथि" },
  "records.status": { en: "Status", hi: "स्थिति" },
  "records.violations": { en: "Violations", hi: "उल्लंघन" },
  "records.action": { en: "Action", hi: "कार्रवाई" },
  "records.view": { en: "View Audit", hi: "ऑडिट देखें" },
  "records.empty": { en: "No inspection records yet. Save one from the workspace.", hi: "अभी कोई जाँच अभिलेख नहीं। कार्यक्षेत्र से एक सहेजें।" },
  "records.count": { en: "records", hi: "अभिलेख" },
  "records.loading": { en: "Loading records…", hi: "अभिलेख लोड हो रहे हैं…" },
  "detail.back": { en: "Back to Registry", hi: "रजिस्टर पर वापस" },
  "detail.audit": { en: "Statutory Audit Record", hi: "सांविधिक ऑडिट अभिलेख" },
  "detail.notfound": { en: "This inspection record could not be found.", hi: "यह जाँच अभिलेख नहीं मिला।" },
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
    const stored = window.localStorage.getItem("mc-lang");
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("mc-lang", l);
  };

  const t = (key: string) => dict[key]?.[lang] ?? dict[key]?.en ?? key;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
