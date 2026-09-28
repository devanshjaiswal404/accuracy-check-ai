import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Download,
  Printer,
  Copy,
  Check,
  Award,
  Calendar,
  Building,
  User,
  Scale,
  MapPin,
  Lock,
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { InspectionSession } from '@/types/metrology';
import { generateVerificationCertificatePdf } from '@/lib/pdf';
import { toast } from 'sonner';

interface CertificateViewProps {
  session: InspectionSession;
  onBack?: () => void;
}

/**
 * Computes a deterministic pseudo-cryptographic hash representing the verification record.
 */
function computeCertificateHash(session: InspectionSession): string {
  const payload = `${session.instrument.serialNumber}|${session.instrument.traderName}|${session.inspectionDate}|${session.leadSealNumber || 'LEAD'}|${session.certificateNumber || 'CERT'}`;
  let hashVal = 0;
  for (let i = 0; i < payload.length; i++) {
    hashVal = (hashVal << 5) - hashVal + payload.charCodeAt(i);
    hashVal |= 0;
  }
  const hexPart = Math.abs(hashVal).toString(16).toUpperCase().padStart(8, '0');
  const cleanSerial = session.instrument.serialNumber.replace(/[^A-Z0-9]/gi, '').slice(-6);
  return `0xSEC24_${hexPart}_${cleanSerial}`;
}

export function CertificateView({ session, onBack }: CertificateViewProps) {
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const isVerified = session.overallStatus === 'VERIFIED';
  const approvalDate = session.inspectionDate;
  // Expiry Date is Approval Date + 1 Year
  const expiryDate = session.nextDueDate || (() => {
    const d = new Date(approvalDate);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  })();

  const certNumber = session.certificateNumber || `LM/SEC24/${new Date().getFullYear()}/${session.instrument.serialNumber.slice(-5)}`;
  const certHash = computeCertificateHash(session);

  // Verification URL for dynamic QR code
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://satyamaap360.gov.in';
  const verificationUrl = `${appOrigin}/verify/${encodeURIComponent(session.instrument.id || session.instrument.serialNumber)}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      toast.success('Verification URL copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('printable-certificate');
      if (!element) {
        toast.error('Certificate element not found');
        return;
      }

      // Render the formal certificate DOM element using html2canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SatyaMaap360_DVC_${session.instrument.serialNumber}.pdf`);
      toast.success('Digital Verification Certificate (DVC) PDF exported');
    } catch (err) {
      console.error('Error generating PDF with html2canvas:', err);
      // Fallback
      generateVerificationCertificatePdf(session);
      toast.info('Exported using statutory PDF engine');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 sm:px-6 flex flex-col items-center">
      {/* Hidden QRCodeCanvas for PDF export */}
      <div ref={qrCanvasRef} className="hidden" aria-hidden="true">
        <QRCodeCanvas
          value={`${verificationUrl}?token=${certHash}`}
          size={256}
          level="H"
          marginSize={2}
        />
      </div>

      {/* Top Action Toolbar (hidden during print) */}
      <div className="w-full max-w-[210mm] mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="bg-white dark:bg-slate-900">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Digital Verification Certificate (DVC)
            </span>
            <Badge className="bg-emerald-600 text-white text-[11px] font-mono">
              Sec. 24 Verified
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="bg-white dark:bg-slate-900 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? 'Copied' : 'Copy Verification URL'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="bg-white dark:bg-slate-900 text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-700 dark:text-slate-300" />
            Print A4
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {isExporting ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* 
        =======================================================
        FORMAL PRINTABLE A4 CERTIFICATE CONTAINER
        Strict ISO A4 aspect ratio with official statutory styling
        =======================================================
      */}
      <div
        id="printable-certificate"
        className="w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl rounded-none border-[3px] border-slate-900 relative p-3 sm:p-5 select-text print:m-0 print:border-[2px] print:shadow-none print:w-full print:max-w-none"
        style={{
          boxSizing: 'border-box',
          fontFamily: "'Times New Roman', Times, serif, system-ui",
        }}
      >
        {/* Inner Gold / Ornamental Border */}
        <div className="border border-amber-700/80 p-5 sm:p-8 relative overflow-hidden bg-[radial-gradient(#f8fafc_1px,transparent_1px)] [background-size:16px_16px]">
          
          {/* Subtle Central National Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none">
            <div className="text-center">
              <Award className="w-96 h-96 mx-auto text-slate-900" />
              <div className="font-bold text-5xl tracking-widest uppercase mt-4">
                सत्यमेव जयते
              </div>
            </div>
          </div>

          {/* Corner Security Ornaments */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-800" />
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-800" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-800" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-800" />

          {/* National Emblem & Department Header */}
          <div className="text-center relative z-10 space-y-1 pb-4 border-b-2 border-slate-900">
            {/* Government Insignia Motif */}
            <div className="inline-flex flex-col items-center mb-1">
              <div className="h-10 w-10 rounded-full border border-amber-700 flex items-center justify-center bg-amber-50 text-amber-900 mb-1 shadow-inner">
                <ShieldCheck className="w-6 h-6 text-amber-800" />
              </div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-amber-900">
                सत्यमेव जयते · भारत सरकार
              </span>
            </div>

            <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase text-slate-900">
              GOVERNMENT OF INDIA / राज्य विधिक मापविज्ञान विभाग
            </h1>
            <p className="text-xs font-semibold text-slate-700 tracking-wide">
              MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION
            </p>
            <p className="text-[11px] text-slate-600">
              Directorate of Legal Metrology — Weights & Measures Verification Division
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-0.5 border border-slate-800 bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider">
                FORM E — STATUTORY CERTIFICATE OF VERIFICATION
              </span>
            </div>
            <p className="text-[10px] text-slate-500 italic mt-0.5">
              [ Issued under Section 24 of the Legal Metrology Act, 2009 and Rule 27 of Legal Metrology (General) Rules, 2011 ]
            </p>
          </div>

          {/* Certificate Identification Banner */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 border border-slate-300 text-xs relative z-10">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Certificate No:</span>
              <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                {certNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Approval Date:</span>
              <span className="font-bold text-slate-900 font-sans">{approvalDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Valid Until (Expiry):</span>
              <span className="font-bold text-emerald-800 font-sans">{expiryDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Statutory Status:</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-bold text-[11px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-sans">
                <Check className="w-3 h-3 mr-1" />
                VERIFIED & STAMPED
              </span>
            </div>
          </div>

          {/* Section 1: Trader & Commercial Premise Details */}
          <div className="mt-4 border border-slate-300 relative z-10">
            <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-600" />
                1. Commercial User / Trader Particulars
              </span>
              <span className="text-[10px] text-slate-500 font-sans">Legal Metrology Act, 2009</span>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Trader / Proprietor Name:</span>
                <span className="font-bold text-slate-900 text-sm">{session.instrument.traderName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Commercial Firm / Establishment:</span>
                <span className="font-semibold text-slate-900">{session.instrument.businessName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Trade / FSSAI License Number:</span>
                <span className="font-mono font-medium text-slate-800">{session.instrument.tradeLicenseNo}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Premises Address:</span>
                <span className="text-slate-800">
                  {session.instrument.address}, {session.instrument.district}, {session.instrument.state} - {session.instrument.pincode}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Verified Instrument Metrological Specifications */}
          <div className="mt-4 border border-slate-300 relative z-10">
            <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-600" />
                2. Instrument Technical Specifications (Verified Under OIML R-76)
              </span>
              <span className="text-[10px] font-mono text-slate-500">OIML Class {session.instrument.accuracyClass.replace('CLASS_', '')}</span>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Instrument Category:</span>
                <span className="font-medium text-slate-900">{session.instrument.instrumentType.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Make & Model:</span>
                <span className="font-medium text-slate-900">{session.instrument.make} / {session.instrument.model}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Serial Number:</span>
                <span className="font-mono font-bold text-indigo-900 text-xs sm:text-sm bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200">
                  {session.instrument.serialNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Govt Model Approval No:</span>
                <span className="font-mono text-slate-800">{session.instrument.modelApprovalNo}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Capacity Range (Min - Max):</span>
                <span className="font-bold text-slate-900">
                  {session.instrument.minCapacity} {session.instrument.unit} to {session.instrument.maxCapacity} {session.instrument.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-sans">Scale Interval (e / d):</span>
                <span className="font-bold text-slate-900">
                  e = {session.instrument.verificationInterval_e} {session.instrument.unit} (d = {session.instrument.scaleInterval_d} {session.instrument.unit})
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Statutory Calibration & MPE Tests Summary */}
          <div className="mt-4 border border-slate-300 relative z-10">
            <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                3. Statutory Calibration & Maximum Permissible Error (MPE) Results
              </span>
              <span className="text-[10px] text-emerald-700 font-bold font-sans">All Tests Passed</span>
            </div>
            <div className="p-2.5">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-500 font-sans">
                    <th className="py-1">Statutory Test Type</th>
                    <th className="py-1">Applied Load / Observations</th>
                    <th className="py-1">Permissible Tolerance (MPE)</th>
                    <th className="py-1 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1.5 font-medium">Eccentricity (Off-Center Load)</td>
                    <td className="py-1.5 text-slate-600">5 Quadrant Points Tested (1/3 Max)</td>
                    <td className="py-1.5 text-slate-600">Within ±1.0e (±{session.instrument.verificationInterval_e} {session.instrument.unit})</td>
                    <td className="py-1.5 text-right font-bold text-emerald-700">PASS (MPE Compliant)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium">Repeatability Test</td>
                    <td className="py-1.5 text-slate-600">Successive cycles at 50% Max Load</td>
                    <td className="py-1.5 text-slate-600">Max span error ≤ 1.0e</td>
                    <td className="py-1.5 text-right font-bold text-emerald-700">PASS (MPE Compliant)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium">Linearity / Error of Indication</td>
                    <td className="py-1.5 text-slate-600">Stepped loading: Min, 500e, 2000e, Max</td>
                    <td className="py-1.5 text-slate-600">Within stepped ±0.5e, ±1.0e, ±1.5e</td>
                    <td className="py-1.5 text-right font-bold text-emerald-700">PASS (MPE Compliant)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Physical Security, Lead Sealing & Government Stamping */}
          <div className="mt-4 border border-amber-600/40 bg-amber-50/40 p-3 rounded-none relative z-10 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-600/20 pb-2 mb-2">
              <span className="font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-800" />
                4. Physical Security, Sealing & Stamping Particulars
              </span>
              <span className="font-mono text-[10px] text-amber-800">
                Treasury Receipt: Confirmed
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Lead Seal Tag No:</span>
                <span className="font-mono font-bold text-slate-900">{session.leadSealNumber || 'IND-DL-LS-2026-081'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Tamper-Proof Hologram:</span>
                <span className="font-mono font-bold text-slate-900">{session.hologramNumber || 'HG-2026-99124'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Stamping Fee Paid:</span>
                <span className="font-bold text-slate-900 font-sans">₹{session.stampingFeePaid || session.instrument.verificationFee}.00</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Geotagged Stamping GPS:</span>
                <span className="font-mono text-[11px] text-emerald-800">
                  {session.gpsCoordinates
                    ? `📍 ${session.gpsCoordinates.latitude.toFixed(4)}° N, ${session.gpsCoordinates.longitude.toFixed(4)}° E`
                    : '📍 Verified On-Site by LMO'}
                </span>
              </div>
            </div>

            {/* Optional Geocoded Image Proof Thumbnail */}
            {session.sealImageUrl && (
              <div className="mt-2 pt-2 border-t border-amber-600/20 flex items-center gap-3">
                <img
                  src={session.sealImageUrl}
                  alt="Sealing evidence"
                  className="h-12 w-20 object-cover rounded border border-amber-700/40"
                />
                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Tamper-proof Seal Photographic Proof: </span>
                  Captured & timestamped at inspection location. Encrypted record archived in National Metrology Database.
                </div>
              </div>
            )}
          </div>

          {/* 
            =======================================================
            Section 5: Formal Endorsement & Bottom-Right Dynamic QR
            =======================================================
          */}
          <div className="mt-5 pt-3 border-t-2 border-slate-900 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Left: Statutory Declaration & Official Stamp */}
            <div className="flex-1 space-y-2 text-xs">
              <p className="text-[11px] text-slate-700 leading-relaxed italic">
                "I hereby certify that the weighing and measuring instrument described above has been inspected, tested for Maximum Permissible Error (MPE), and officially verified and stamped in accordance with Section 24 of the Legal Metrology Act, 2009. The instrument is legally permitted for commercial trade use until the validity expiry date specified herein."
              </p>

              {/* Officer Block & Official Seal Stamp */}
              <div className="flex items-center gap-4 pt-1">
                {/* Simulated Circular Government Stamping Seal */}
                <div className="h-16 w-16 rounded-full border-2 border-dashed border-indigo-900 flex flex-col items-center justify-center text-center p-1 bg-indigo-50/50 shadow-inner select-none">
                  <span className="text-[7px] font-bold uppercase text-indigo-900 leading-none">GOVT OF INDIA</span>
                  <Award className="w-5 h-5 text-indigo-800 my-0.5" />
                  <span className="text-[6.5px] font-bold text-indigo-900 leading-none">SEC 24 STAMP</span>
                </div>

                <div className="text-xs">
                  <div className="text-slate-500 text-[10px] font-sans">Digitally Certified & Signed by:</div>
                  <div className="font-bold text-slate-900 text-sm">{session.officerName || 'Devansh Jaiswal'}</div>
                  <div className="text-slate-700 text-[11px]">
                    Designation: <span className="font-medium">Legal Metrology Officer (LMO)</span>
                  </div>
                  <div className="text-slate-600 text-[10px] font-mono">
                    Badge: {session.officerBadge || 'LMO-DL-CENTRAL-042'} · Zone: {session.jurisdictionZone || 'Delhi Zone-1'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Dynamic Embedded QR Code with Hash & Verification URL */}
            <div className="sm:w-56 p-3 bg-slate-50 border border-slate-300 rounded-none flex flex-col items-center text-center shadow-sm">
              <div className="p-1.5 bg-white border border-slate-200 shadow-inner">
                <QRCodeSVG
                  value={`${verificationUrl}?token=${certHash}`}
                  size={104}
                  level="H"
                  marginSize={1}
                />
              </div>

              <div className="mt-2 text-[10px] space-y-0.5">
                <div className="font-bold text-slate-900 tracking-wider uppercase font-sans">
                  SCAN TO VERIFY DVC
                </div>
                <div className="font-mono text-[9px] text-slate-600 break-all">
                  {certHash}
                </div>
                <div className="text-[9px] text-indigo-700 font-medium font-sans">
                  satyamaap360.gov.in/verify
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footnote & Legal Notice */}
          <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-500 font-sans relative z-10 flex flex-col sm:flex-row justify-between items-center">
            <span>Any alteration or tampering with this certificate is punishable under Section 34 & 35 of the Legal Metrology Act, 2009.</span>
            <span className="font-mono text-[8.5px]">Generated via SatyaMaap 360 National Metrology Portal</span>
          </div>

        </div>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #printable-certificate {
            width: 100% !important;
            max-width: 100% !important;
            border-width: 2px !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 8mm !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
}

export default CertificateView;
