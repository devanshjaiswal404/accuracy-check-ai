import attaImg from "@/assets/atta-pack.jpg";
import biscuitImg from "@/assets/biscuit-pack.jpg";

export type CheckStatus = "pass" | "violation" | "review";
export type SampleKey = "atta" | "biscuit" | "custom";
export type ImageTab = "front" | "back" | "panel";
export type AuditStatus = "COMPLIANT" | "NON-COMPLIANT" | "REVIEW";

export interface PackInput {
  productKey: SampleKey;
  productName: string;
  brand: string;
  category: string;
  mrp: string;
  netQty: string;
  declaredUsp: string;
  manufacturer: string;
  grievanceEmail: string;
  grievancePhone: string;
}

export interface ClauseCheck {
  clause: string;
  title: string;
  status: CheckStatus;
  severity: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
  extracted?: string;
  remediation?: string;
}

export interface BoundingBox {
  id: string;
  kind: "ok" | "violation";
  text: string;
  /** percent coordinates of the preview container */
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Sample {
  image: string;
  input: PackInput;
  mock: Record<Exclude<ImageTab, "front">, string[]>;
  boxes: Record<ImageTab, BoundingBox[]>;
}

export const SAMPLES: Record<"atta" | "biscuit", Sample> = {
  atta: {
    image: attaImg,
    input: {
      productKey: "atta",
      productName: "Shakti Whole Wheat Atta",
      brand: "Shakti Foods",
      category: "Atta & Flour",
      mrp: "MRP ₹240.00 (Inclusive of all taxes)",
      netQty: "5 kg",
      declaredUsp: "USP ₹48.00/kg",
      manufacturer: "Shakti Foods Ltd., Plot 3, Okhla Industrial Area Phase II, New Delhi - 110020",
      grievanceEmail: "care@shaktifoods.in",
      grievancePhone: "1800-419-0024",
    },
    mock: {
      back: [
        "Marketed by: Shakti Foods Ltd.",
        "Plot 3, Okhla Industrial Area Phase II,",
        "New Delhi - 110020",
        "FSSAI Lic. No. 10012345678901",
        "Consumer Care: care@shaktifoods.in",
        "Toll Free: 1800-419-0024",
        "Best before 9 months from packaging",
      ],
      panel: [
        "MRP: ₹240.00 (Inclusive of all taxes)",
        "USP: ₹48.00/kg",
        "Net Qty: 5 kg",
        "Mfg. Date: SEE BASE",
        "Per 100g: Energy 346 kcal",
        "Ingredients: Whole Wheat (100%)",
      ],
    },
    boxes: {
      front: [
        { id: "a1", kind: "ok", text: "MRP ₹240.00 incl. of all taxes", x: 56, y: 76, w: 40, h: 16 },
        { id: "a2", kind: "ok", text: "NET QTY 5 kg", x: 3, y: 78, w: 27, h: 15 },
        { id: "a3", kind: "ok", text: "Shakti Foods Ltd. · New Delhi 110020", x: 26, y: 28, w: 48, h: 16 },
      ],
      back: [
        { id: "a4", kind: "ok", text: "Postal address + PIN 110020", x: 6, y: 18, w: 62, h: 18 },
        { id: "a5", kind: "ok", text: "care@shaktifoods.in", x: 6, y: 52, w: 52, h: 12 },
        { id: "a6", kind: "ok", text: "Helpline 1800-419-0024", x: 6, y: 68, w: 50, h: 12 },
      ],
      panel: [
        { id: "a7", kind: "ok", text: "MRP incl. of all taxes", x: 5, y: 12, w: 66, h: 13 },
        { id: "a8", kind: "ok", text: "USP ₹48.00/kg", x: 5, y: 30, w: 40, h: 13 },
        { id: "a9", kind: "ok", text: "Net Qty 5 kg (SI)", x: 5, y: 48, w: 40, h: 13 },
      ],
    },
  },
  biscuit: {
    image: biscuitImg,
    input: {
      productKey: "biscuit",
      productName: "Choco Crunch Biscuits",
      brand: "BakeWell",
      category: "Bakery & Snacks",
      mrp: "MRP ₹30",
      netQty: "200 gms",
      declaredUsp: "",
      manufacturer: "BakeWell Foods Pvt. Ltd., 14 MIDC Andheri East, Mumbai - 400093",
      grievanceEmail: "",
      grievancePhone: "1800-262-2233",
    },
    mock: {
      back: [
        "Mfd. by: BakeWell Foods Pvt. Ltd.",
        "14 MIDC Andheri East, Mumbai - 400093",
        "FSSAI Lic. No. 11523998000123",
        "Consumer Care: Helpline 1800-262-2233",
        "Store in a cool, dry place.",
      ],
      panel: [
        "MRP: ₹30  [tax declaration missing]",
        "USP: — not declared —",
        "Net Wt.: 200 gms",
        "Ingredients: Wheat flour, sugar, edible veg. oil,",
        "chocoa solids, milk solids, raising agent (500)",
      ],
    },
    boxes: {
      front: [
        { id: "b1", kind: "violation", text: "MRP ₹30 — 'incl. of all taxes' missing", x: 55, y: 4, w: 42, h: 16 },
        { id: "b2", kind: "violation", text: "Net Wt. 200 gms — non-standard unit", x: 3, y: 74, w: 34, h: 15 },
        { id: "b3", kind: "ok", text: "BakeWell Foods Pvt. Ltd. · Mumbai 400093", x: 22, y: 46, w: 56, h: 15 },
      ],
      back: [
        { id: "b4", kind: "ok", text: "Postal address + PIN 400093", x: 6, y: 12, w: 62, h: 16 },
        { id: "b5", kind: "violation", text: "Grievance: no e-mail declared", x: 6, y: 52, w: 60, h: 13 },
      ],
      panel: [
        { id: "b6", kind: "violation", text: "MRP ₹30 — tax declaration missing", x: 5, y: 8, w: 62, h: 14 },
        { id: "b7", kind: "violation", text: "USP not declared (Rule 6(11))", x: 5, y: 27, w: 52, h: 13 },
        { id: "b8", kind: "violation", text: "'gms' is not an SI symbol", x: 5, y: 45, w: 40, h: 13 },
      ],
    },
  },
};

export function customPack(): PackInput {
  return {
    productKey: "custom",
    productName: "Unidentified Pack",
    brand: "—",
    category: "General",
    mrp: "",
    netQty: "",
    declaredUsp: "",
    manufacturer: "",
    grievanceEmail: "",
    grievancePhone: "",
  };
}

function parseAmount(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

/** grams (or millilitres) of the declared net quantity */
function parseQtyGrams(qty: string): { value: number; unit: string } | null {
  const m = qty.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z.]+)$/);
  if (!m) return null;
  return { value: parseFloat(m[1]), unit: m[2].replace(/\.$/, "").toLowerCase() };
}

export function analyze(input: PackInput): ClauseCheck[] {
  if (input.productKey === "custom") {
    const generic: Omit<ClauseCheck, "status">[] = [
      { clause: "Rule 6(1)(a)", title: "Manufacturer / Packer name & postal address", severity: "HIGH", detail: "OCR confidence below threshold — manual verification of name and postal address with PIN is required." },
      { clause: "Rule 6(1)(c) & 12", title: "Net quantity in standard SI units", severity: "HIGH", detail: "OCR confidence below threshold — verify the declared quantity uses g / kg / ml / L." },
      { clause: "Rule 6(1)(e)", title: "MRP declaration format", severity: "HIGH", detail: "OCR confidence below threshold — verify MRP states 'inclusive of all taxes'." },
      { clause: "Rule 6(11)", title: "Unit sale price (USP) calculation", severity: "MEDIUM", detail: "OCR confidence below threshold — verify USP equals MRP ÷ net quantity." },
      { clause: "Rule 6(1)(n)", title: "Consumer grievance redressal", severity: "MEDIUM", detail: "OCR confidence below threshold — verify e-mail, telephone helpline and address are declared." },
    ];
    return generic.map((g) => ({ ...g, status: "review" as const }));
  }

  const checks: ClauseCheck[] = [];

  // Rule 6(1)(a) — name & postal address with PIN
  const pinOk = /\b\d{6}\b/.test(input.manufacturer);
  const addrOk = input.manufacturer.trim().length >= 30 && pinOk;
  checks.push({
    clause: "Rule 6(1)(a)",
    title: "Manufacturer / Packer name & postal address",
    status: addrOk ? "pass" : "violation",
    severity: "HIGH",
    detail: addrOk
      ? "Name and complete postal address with PIN code are declared on the pack."
      : "Manufacturer name or a complete postal address with PIN code was not found.",
    extracted: input.manufacturer || "(nothing detected)",
    remediation: addrOk ? undefined : "Declare the full manufacturing / packing address including the 6-digit PIN code.",
  });

  // Rule 6(1)(c) & Rule 12 — standard SI units
  const qty = parseQtyGrams(input.netQty);
  const stdUnits = new Set(["g", "kg", "ml", "l", "cl"]);
  const qtyOk = !!qty && stdUnits.has(qty.unit);
  checks.push({
    clause: "Rule 6(1)(c) & 12",
    title: "Net quantity in standard SI units",
    status: qtyOk ? "pass" : "violation",
    severity: "HIGH",
    detail: qtyOk
      ? `Declared quantity "${input.netQty}" uses a prescribed SI symbol.`
      : qty
        ? `"${input.netQty}" uses a non-standard symbol ("${qty.unit}"). Prescribed symbols are g, kg, ml, L, cl.`
        : `"${input.netQty}" is not a readable quantity declaration.`,
    extracted: input.netQty || "(nothing detected)",
    remediation: qtyOk ? undefined : 'Replace informal units like "gms", "kilos", "ml." with Rule 12 symbols: g, kg, ml, L.',
  });

  // Rule 6(1)(e) — MRP declaration
  const mrpNum = parseAmount(input.mrp);
  const hasTax = /incl(?:usive)?\.?\s*of\s*all\s*taxes/i.test(input.mrp);
  const mrpOk = mrpNum !== null && hasTax;
  checks.push({
    clause: "Rule 6(1)(e)",
    title: "MRP declaration format",
    status: mrpOk ? "pass" : "violation",
    severity: "HIGH",
    detail: mrpOk
      ? "MRP is declared with the words 'inclusive of all taxes'."
      : mrpNum !== null
        ? "MRP amount is present but the mandatory words 'inclusive of all taxes' are missing."
        : "No readable MRP declaration was found on the pack.",
    extracted: input.mrp || "(nothing detected)",
    remediation: mrpOk ? undefined : 'Print MRP as "MRP ₹__.00 (inclusive of all taxes)".',
  });

  // Rule 6(11) — unit sale price
  const declaredUsp = parseAmount(input.declaredUsp);
  const perUnit = qty && ["g", "ml"].includes(qty.unit) ? qty.value / 1000 : qty && ["kg", "l"].includes(qty.unit) ? qty.value : null;
  let uspStatus: CheckStatus;
  let uspDetail: string;
  let uspRemediation: string | undefined;
  if (declaredUsp === null) {
    uspStatus = "violation";
    uspDetail = "Unit sale price (USP) is not declared on the pack.";
    uspRemediation = "Declare USP as MRP ÷ net quantity, e.g. ₹48.00/kg.";
  } else if (mrpNum !== null && perUnit && perUnit > 0) {
    const computed = mrpNum / perUnit;
    if (Math.abs(computed - declaredUsp) / computed <= 0.02) {
      uspStatus = "pass";
      uspDetail = `Declared USP ₹${declaredUsp.toFixed(2)} matches the computed MRP ÷ quantity (₹${computed.toFixed(2)}).`;
    } else {
      uspStatus = "violation";
      uspDetail = `Declared USP ₹${declaredUsp.toFixed(2)} does not match computed ₹${computed.toFixed(2)} (MRP ÷ quantity).`;
      uspRemediation = `Correct the USP to ₹${computed.toFixed(2)} for the declared ${qty?.unit === "kg" || qty?.unit === "l" ? "kg/L" : "g/ml"} quantity.`;
    }
  } else {
    uspStatus = "review";
    uspDetail = "USP is declared but the quantity could not be parsed — verify the arithmetic manually.";
  }
  checks.push({
    clause: "Rule 6(11)",
    title: "Unit sale price (USP) calculation",
    status: uspStatus,
    severity: "MEDIUM",
    detail: uspDetail,
    extracted: input.declaredUsp || "(nothing detected)",
    remediation: uspRemediation,
  });

  // Rule 6(1)(n) — consumer grievance redressal
  const emailOk = /.+@.+\..+/.test(input.grievanceEmail);
  const phoneOk = /^[+\d][\d\s-]{8,}$/.test(input.grievancePhone);
  const missing: string[] = [];
  if (!emailOk) missing.push("e-mail");
  if (!phoneOk) missing.push("telephone helpline");
  checks.push({
    clause: "Rule 6(1)(n)",
    title: "Consumer grievance redressal",
    status: missing.length === 0 ? "pass" : "violation",
    severity: "MEDIUM",
    detail:
      missing.length === 0
        ? "E-mail, telephone helpline and address for consumer complaints are declared."
        : `Consumer grievance details incomplete — missing: ${missing.join(", ")}.`,
    extracted: [input.grievanceEmail, input.grievancePhone].filter(Boolean).join(" · ") || "(nothing detected)",
    remediation: missing.length === 0 ? undefined : `Declare the missing channel(s): ${missing.join(", ")} alongside the postal address.`,
  });

  return checks;
}

export function deriveStatus(checks: ClauseCheck[]): AuditStatus {
  if (checks.some((c) => c.status === "violation")) return "NON-COMPLIANT";
  if (checks.some((c) => c.status === "review")) return "REVIEW";
  return "COMPLIANT";
}
