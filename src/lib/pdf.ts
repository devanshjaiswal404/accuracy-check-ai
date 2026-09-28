import { jsPDF } from "jspdf";
import type { InspectionSession } from "@/types/metrology";

export interface NoticeViolation {
  clause: string;
  title: string;
  severity?: string | null | undefined;
  extracted?: string | null | undefined;
  extractedText?: string | null | undefined;
  remediation?: string | null | undefined;
}

export interface NoticeData {
  productName: string;
  brand: string;
  category: string;
  status: string;
  officer: string;
  violations: NoticeViolation[];
}

export function buildNoticePdf(d: NoticeData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 30;

  // Header band
  doc.setFillColor(16, 22, 30);
  doc.rect(0, 0, W, 96, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("SATYAMAAP 360", M, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(160, 180, 170);
  doc.text("Legal Metrology Division — Weights and Measures Inspection Registry", M, 56);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("STATUTORY INSPECTION RECORD", M, 78);
  y = 128;

  doc.setTextColor(30, 34, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta: [string, string][] = [
    ["Instrument / Item", d.productName],
    ["Brand / Make", d.brand || "—"],
    ["Category", d.category || "General"],
    ["Inspecting Officer", d.officer],
    ["Audit Result", d.status],
    ["Date of Inspection", new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })],
  ];
  for (const [k, v] of meta) {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, M, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, M + 140, y);
    y += 18;
  }
  doc.save(`Inspection_${d.productName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

export function generateVerificationCertificatePdf(session: InspectionSession, qrDataUrl?: string): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const contentW = W - 2 * M;
  let y = 30;

  // Outer border
  doc.setDrawColor(20, 50, 90);
  doc.setLineWidth(2);
  doc.rect(M - 15, 20, contentW + 30, 800);

  // Inner border
  doc.setLineWidth(0.75);
  doc.rect(M - 11, 24, contentW + 22, 792);

  // National Header Band
  doc.setFillColor(15, 30, 60);
  doc.rect(M - 10, 25, contentW + 20, 65, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("GOVERNMENT OF INDIA / राज्य विधिक मापविज्ञान विभाग", W / 2, 48, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(220, 235, 255);
  doc.text("DEPARTMENT OF CONSUMER AFFAIRS — LEGAL METROLOGY DIVISION", W / 2, 64, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(190, 210, 235);
  doc.text("Under Section 24 of the Legal Metrology Act, 2009 & Legal Metrology (General) Rules, 2011", W / 2, 77, { align: "center" });

  y = 110;

  // Certificate Title
  doc.setTextColor(15, 30, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const titleText = session.overallStatus === "VERIFIED"
    ? "CERTIFICATE OF VERIFICATION / सत्यापन प्रमाण पत्र"
    : "MEMORANDUM OF REJECTION / अस्वीकृति ज्ञापन";
  doc.text(titleText, W / 2, y, { align: "center" });

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 110, 120);
  doc.text(`[ Statutory Form as per Seventh Schedule, Rule 27 ]`, W / 2, y, { align: "center" });

  y += 24;

  // Certificate Meta Block (2 columns)
  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(210, 225, 245);
  doc.rect(M, y, contentW, 46, "FD");

  doc.setFontSize(9);
  doc.setTextColor(30, 45, 60);

  doc.setFont("helvetica", "bold");
  doc.text("Certificate No:", M + 12, y + 18);
  doc.setFont("helvetica", "normal");
  doc.text(session.certificateNumber || "PROVISIONAL-PENDING", M + 95, y + 18);

  doc.setFont("helvetica", "bold");
  doc.text("Verification Date:", M + 12, y + 34);
  doc.setFont("helvetica", "normal");
  doc.text(session.inspectionDate, M + 95, y + 34);

  doc.setFont("helvetica", "bold");
  doc.text("Application Ref:", W / 2 + 10, y + 18);
  doc.setFont("helvetica", "normal");
  doc.text(session.instrument.applicationNo, W / 2 + 95, y + 18);

  doc.setFont("helvetica", "bold");
  doc.text("Valid Until / Next Due:", W / 2 + 10, y + 34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(session.overallStatus === "VERIFIED" ? 20 : 180, session.overallStatus === "VERIFIED" ? 120 : 30, 30);
  doc.text(session.nextDueDate, W / 2 + 115, y + 34);

  y += 62;

  // Section 1: Trader & Premise Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 30, 60);
  doc.text("1. TRADER & BUSINESS PREMISES PARTICULARS", M, y);
  y += 8;
  doc.setDrawColor(180, 200, 225);
  doc.line(M, y, M + contentW, y);
  y += 14;

  const traderDetails = [
    ["Name of Owner / Trader:", session.instrument.traderName],
    ["Business / Commercial Firm:", session.instrument.businessName],
    ["Trade / FSSAI License No:", session.instrument.tradeLicenseNo],
    ["Premises Address:", `${session.instrument.address}, ${session.instrument.district}, ${session.instrument.state} - ${session.instrument.pincode}`],
  ];

  doc.setFontSize(8.5);
  for (const [lbl, val] of traderDetails) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 65, 80);
    doc.text(lbl, M + 8, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(val, M + 160, y);
    y += 14;
  }

  y += 8;

  // Section 2: Instrument Specification
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 30, 60);
  doc.text("2. SPECIFICATIONS OF WEIGHING / MEASURING INSTRUMENT", M, y);
  y += 8;
  doc.line(M, y, M + contentW, y);
  y += 14;

  const instDetails = [
    ["Type of Instrument:", session.instrument.instrumentType.replace(/_/g, " ")],
    ["Make & Model:", `${session.instrument.make} / ${session.instrument.model}`],
    ["Serial Number:", session.instrument.serialNumber],
    ["Govt Model Approval No:", session.instrument.modelApprovalNo],
    ["Accuracy Class:", `${session.instrument.accuracyClass.replace(/_/g, " ")} (OIML R-76)`],
    ["Capacity Range (Min - Max):", `${session.instrument.minCapacity} ${session.instrument.unit} to ${session.instrument.maxCapacity} ${session.instrument.unit}`],
    ["Verification Scale Interval (e):", `${session.instrument.verificationInterval_e} ${session.instrument.unit} (d = ${session.instrument.scaleInterval_d} ${session.instrument.unit})`],
  ];

  for (const [lbl, val] of instDetails) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 65, 80);
    doc.text(lbl, M + 8, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(val, M + 160, y);
    y += 13;
  }

  y += 8;

  // Section 3: Statutory Metrological Test Results
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 30, 60);
  doc.text("3. STATUTORY METROLOGICAL TEST SUMMARY (MPE EVALUATION)", M, y);
  y += 8;
  doc.line(M, y, M + contentW, y);
  y += 14;

  // Table header
  doc.setFillColor(230, 240, 250);
  doc.rect(M, y, contentW, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 30, 60);
  doc.text("TEST TYPE", M + 8, y + 12);
  doc.text("OBSERVATIONS", M + 140, y + 12);
  doc.text("MAX PERMISSIBLE ERROR (MPE)", M + 280, y + 12);
  doc.text("RESULT", M + 450, y + 12);
  y += 22;

  const testSummary = [
    {
      name: "Eccentricity (Off-Center Load)",
      obs: `${session.eccentricityTests.length} Positions Tested (1/3 Max Load)`,
      mpe: "Within ±1.0e statutory limit",
      status: session.eccentricityTests.every((t) => t.isCompliant) ? "PASS" : "FAIL",
    },
    {
      name: "Repeatability Test",
      obs: `${session.repeatabilityTests.length} Successive Weighing Cycles`,
      mpe: "Max difference ≤ range tolerance",
      status: session.repeatabilityTests.every((t) => t.isCompliant) ? "PASS" : "FAIL",
    },
    {
      name: "Linearity / Error of Indication",
      obs: `${session.linearityTests.length} Load Points across Min to Max`,
      mpe: "Within stepped ±0.5e, ±1.0e, ±1.5e",
      status: session.linearityTests.every((t) => t.isCompliant) ? "PASS" : "FAIL",
    },
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const t of testSummary) {
    doc.text(t.name, M + 8, y + 2);
    doc.text(t.obs, M + 140, y + 2);
    doc.text(t.mpe, M + 280, y + 2);
    doc.setFont("helvetica", "bold");
    if (t.status === "PASS") {
      doc.setTextColor(20, 120, 40);
    } else {
      doc.setTextColor(190, 30, 30);
    }
    doc.text(t.status, M + 450, y + 2);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    y += 15;
  }

  y += 8;

  // Section 4: Physical Sealing & Government Stamping Details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(210, 220, 230);
  doc.rect(M, y, contentW, 60, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 30, 60);
  doc.text("Statutory Lead Seal / Security Tag ID:", M + 10, y + 15);
  doc.setFont("helvetica", "normal");
  doc.text(session.leadSealNumber || "N/A (Pending Stamping)", M + 190, y + 15);

  doc.setFont("helvetica", "bold");
  doc.text("Tamper-Proof Hologram Number:", M + 10, y + 28);
  doc.setFont("helvetica", "normal");
  doc.text(session.hologramNumber || "N/A", M + 190, y + 28);

  doc.setFont("helvetica", "bold");
  doc.text("GPS Geocoded Stamping Location:", M + 10, y + 41);
  doc.setFont("helvetica", "normal");
  const gpsDisplay = session.gpsCoordinates
    ? `${session.gpsCoordinates.latitude.toFixed(5)}° N, ${session.gpsCoordinates.longitude.toFixed(5)}° E (±${Math.round(session.gpsCoordinates.accuracy)}m)`
    : "Verified In-Person by LMO";
  doc.text(gpsDisplay, M + 190, y + 41);

  doc.setFont("helvetica", "bold");
  doc.text("Government Stamping Fee Paid:", M + 10, y + 54);
  doc.setFont("helvetica", "normal");
  doc.text(`INR ${session.stampingFeePaid}.00 (e-Treasury Receipt Confirmed)`, M + 190, y + 54);

  y += 76;

  // Signatures & Endorsement
  doc.setFontSize(8);
  doc.setTextColor(60, 70, 80);
  doc.text(
    "I hereby certify that the above mentioned instrument has been tested and verified in accordance with Section 24 of the Legal Metrology Act, 2009 and is stamped with the official government seal.",
    M,
    y,
    { maxWidth: contentW }
  );

  y += 28;

  // QR verification block on left / bottom
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', M + 5, y - 2, 58, 58);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 30, 60);
      doc.text("SEC 24 DVC VERIFIED", M + 70, y + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(70, 80, 95);
      doc.text(`Serial: ${session.instrument.serialNumber}`, M + 70, y + 24);
      doc.text(`Cert: ${session.certificateNumber || 'PROVISIONAL'}`, M + 70, y + 35);
      doc.text("Scan QR to verify on SatyaMaap 360", M + 70, y + 46);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 30, 60);
      doc.text("[ Scan QR code to verify on SatyaMaap 360 National Registry ]", M, y + 20);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 30, 60);
    doc.text("[ Scan QR code to verify on SatyaMaap 360 National Registry ]", M, y + 20);
  }

  // Officer block on right
  const officerX = W - M - 210;
  doc.text("Digitally Certified by:", officerX, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(session.officerName, officerX, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Designation: Legal Metrology Officer (LMO)`, officerX, y + 25);
  doc.text(`Officer Badge: ${session.officerBadge}`, officerX, y + 37);
  doc.text(`Zone: ${session.jurisdictionZone}`, officerX, y + 49);

  // Save PDF
  const filename = `SatyaMaap360_Sec24_${session.instrument.serialNumber}.pdf`;
  doc.save(filename);
}
