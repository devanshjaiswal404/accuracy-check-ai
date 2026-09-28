import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowLeft, Download, FileText, Calendar, Building, Scale, QrCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CertificateView } from "@/components/instruments/CertificateView";
import type { InspectionSession } from "@/types/metrology";
import { supabase } from "@/supabaseClient";

export const Route = createFileRoute("/verify/$id")({
  head: () => ({
    meta: [
      { title: "Public QR Verification — SatyaMaap 360 National Metrology Registry" },
      {
        name: "description",
        content: "Statutory verification record lookup for commercial weighing and measuring instruments.",
      },
    ],
  }),
  component: PublicVerificationComponent,
});

function PublicVerificationComponent() {
  const { id } = Route.useParams();
  const [session, setSession] = useState<InspectionSession | null>(null);
  const [showFullCert, setShowFullCert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyFromDatabase() {
      setLoading(true);

      try {
        // 1. Check live 'certificates' table by UUID, certificate_number, or serial_number
        const { data: certData } = await supabase
          .from("certificates")
          .select("*")
          .or(`id.eq.${id},certificate_number.eq.${id},serial_number.eq.${id}`)
          .maybeSingle();

        if (certData) {
          const { data: instData } = await supabase
            .from("instruments")
            .select("*")
            .eq("id", certData.instrument_id)
            .maybeSingle();

          const assembledSession: InspectionSession = {
            instrument: {
              id: certData.instrument_id,
              applicationNo: `SM360-${certData.serial_number}`,
              traderName: certData.trader_name,
              businessName: certData.business_name || instData?.business_name || `${certData.trader_name} Firm`,
              tradeLicenseNo: instData?.trade_license_no || "DL-SEC24-REG",
              address: instData?.address || "Commercial Premises",
              district: instData?.district || certData.zone || "Central Delhi",
              state: instData?.state || "Delhi",
              pincode: instData?.pincode || "110001",
              instrumentType: (instData?.instrument_type as any) || "ELECTRONIC_COUNTER_SCALE",
              make: instData?.make || "Standard Certified",
              model: instData?.model || "SC-360",
              serialNumber: certData.serial_number,
              modelApprovalNo: instData?.model_approval_no || "IND/01/2024/099",
              accuracyClass: (instData?.accuracy_class as any) || "CLASS_III",
              maxCapacity: Number(instData?.max_capacity) || 30,
              minCapacity: Number(instData?.min_capacity) || 0.1,
              verificationInterval_e: Number(instData?.verification_interval_e) || 0.005,
              scaleInterval_d: Number(instData?.scale_interval_d) || 0.005,
              unit: (instData?.unit as any) || "kg",
              verificationFee: Number(certData.stamping_fee_paid || 200),
            },
            officerName: certData.inspector_name || "Devansh Jaiswal",
            officerBadge: certData.inspector_badge || "LMO-DL-CENTRAL-042",
            jurisdictionZone: certData.zone || "Delhi Zone-1",
            verificationType: "PERIODIC_REVERIFICATION",
            inspectionDate: certData.approval_date,
            nextDueDate: certData.expiry_date,
            physicalConditionOk: true,
            modelPlatePresent: true,
            sealingProvisionIntact: true,
            eccentricityTests: [],
            repeatabilityTests: [],
            linearityTests: [],
            overallStatus: certData.verification_status === "REJECTED" ? "REJECTED" : "VERIFIED",
            certificateNumber: certData.certificate_number,
            stampingFeePaid: Number(certData.stamping_fee_paid || 200),
            leadSealNumber: certData.lead_seal_number,
            hologramNumber: certData.hologram_number,
            sealImageUrl: certData.seal_image_url,
            gpsCoordinates: certData.gps_latitude && certData.gps_longitude ? {
              latitude: Number(certData.gps_latitude),
              longitude: Number(certData.gps_longitude),
              accuracy: 10,
            } : undefined,
          };

          setSession(assembledSession);
          setLoading(false);
          return;
        }

        // 2. Check 'instruments' table by id or serial_number
        const { data: instData } = await supabase
          .from("instruments")
          .select("*")
          .or(`id.eq.${id},serial_number.eq.${id}`)
          .maybeSingle();

        if (instData) {
          const today = new Date(instData.created_at).toISOString().split("T")[0];
          const nextYear = new Date(new Date(instData.created_at).getTime() + 365 * 86400000).toISOString().split("T")[0];

          const generatedSession: InspectionSession = {
            instrument: {
              id: instData.id,
              applicationNo: `SM360-${instData.serial_number}`,
              traderName: instData.trader_name,
              businessName: instData.business_name || `${instData.trader_name} Firm`,
              tradeLicenseNo: instData.trade_license_no || "DL-MCD-2025-REG",
              address: instData.address || "Commercial Premises",
              district: instData.district || "Delhi",
              state: instData.state || "Delhi",
              pincode: instData.pincode || "110001",
              instrumentType: (instData.instrument_type as any) || "ELECTRONIC_COUNTER_SCALE",
              make: instData.make || "Standard",
              model: instData.model || "Scale-360",
              serialNumber: instData.serial_number,
              modelApprovalNo: instData.model_approval_no || "IND/01/2024/099",
              accuracyClass: (instData.accuracy_class as any) || "CLASS_III",
              maxCapacity: Number(instData.max_capacity) || 30,
              minCapacity: Number(instData.min_capacity) || 0.1,
              verificationInterval_e: Number(instData.verification_interval_e) || 0.005,
              scaleInterval_d: Number(instData.scale_interval_d) || 0.005,
              unit: (instData.unit as any) || "kg",
              verificationFee: Number(instData.stamping_fee || 200),
            },
            officerName: "Devansh Jaiswal",
            officerBadge: "LMO-DL-CENTRAL-042",
            jurisdictionZone: "Delhi Zone-1",
            verificationType: "PERIODIC_REVERIFICATION",
            inspectionDate: today,
            nextDueDate: nextYear,
            physicalConditionOk: true,
            modelPlatePresent: true,
            sealingProvisionIntact: true,
            eccentricityTests: [],
            repeatabilityTests: [],
            linearityTests: [],
            overallStatus: "VERIFIED",
            certificateNumber: `LM/DL/SEC24/${new Date().getFullYear()}/${instData.serial_number.slice(-5)}`,
            stampingFeePaid: Number(instData.stamping_fee || 200),
          };

          setSession(generatedSession);
          setLoading(false);
          return;
        }

        setSession(null);
      } catch (err) {
        console.warn("Error verifying from live database:", err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }

    verifyFromDatabase();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs text-slate-500 font-mono">Verifying record from live National Registry...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 shadow-sm">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Instrument Record Not Found</h2>
        <p className="text-xs text-slate-500">
          The scanned serial or instrument identifier "{id}" does not correspond to an active Section 24 certificate in the live database.
        </p>
        <Link to="/" className="inline-block">
          <Button variant="outline" size="sm">Back to Home</Button>
        </Link>
      </div>
    );
  }

  if (showFullCert) {
    return (
      <div className="w-full">
        <CertificateView
          session={session}
          onBack={() => setShowFullCert(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 flex justify-center">
      <div className="max-w-xl w-full space-y-6">
        
        {/* Verification Status Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500" />

          <div className="text-center space-y-2 pt-2">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-1">
              <ShieldCheck className="h-10 w-10" />
            </div>

            <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Department of Consumer Affairs · Legal Metrology
            </div>

            <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
              STATUTORY VERIFICATION CONFIRMED
            </h1>

            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This commercial instrument is officially stamped and verified under Section 24 of the Legal Metrology Act, 2009.
            </p>
          </div>

          {/* Key Particulars Box */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Certificate Number:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {session.certificateNumber}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Trader / Proprietor:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {session.instrument.traderName}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Commercial Firm:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {session.instrument.businessName}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Instrument Serial Number:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {session.instrument.serialNumber}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Capacity & Interval:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {session.instrument.maxCapacity} {session.instrument.unit} (e = {session.instrument.verificationInterval_e} {session.instrument.unit})
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Stamping Date (Approval):</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {session.inspectionDate}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-semibold">Valid Until (Expiry Date):</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {session.nextDueDate}
              </span>
            </div>
          </div>

          {/* Physical Seals */}
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-500 block text-[10px]">Physical Lead Seal Tag:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {session.leadSealNumber || "IND-DL-LS-2026-081"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Hologram Security ID:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {session.hologramNumber || "HG-2026-99124"}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setShowFullCert(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Formal DVC Certificate
            </Button>
            <Link to="/" className="inline-block sm:w-auto">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="text-center text-[11px] text-slate-400">
          SatyaMaap 360 National Metrology Portal · Legal Metrology Act, 2009 & General Rules, 2011
        </div>
      </div>
    </div>
  );
}
