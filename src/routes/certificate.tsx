import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CertificateView } from "@/components/instruments/CertificateView";
import type { InspectionSession } from "@/types/metrology";
import { supabase } from "@/supabaseClient";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/certificate")({
  head: () => ({
    meta: [
      { title: "Digital Verification Certificate (DVC) — SatyaMaap 360" },
      {
        name: "description",
        content: "Statutory Certificate of Verification issued under Section 24 of the Legal Metrology Act, 2009.",
      },
    ],
  }),
  component: CertificateRouteComponent,
});

function CertificateRouteComponent() {
  const [session, setSession] = useState<InspectionSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadCertificate() {
      setIsLoading(true);
      setErrorMsg(null);

      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const queryId = params.get("id") || params.get("cert") || params.get("serial");

      try {
        // 1. Query 'certificates' table first
        let certQuery = supabase.from("certificates").select("*");
        if (queryId) {
          certQuery = certQuery.or(`id.eq.${queryId},certificate_number.eq.${queryId},serial_number.eq.${queryId}`);
        } else {
          certQuery = certQuery.order("created_at", { ascending: false }).limit(1);
        }

        const { data: certData, error: certErr } = await certQuery.maybeSingle();

        if (certData) {
          // Fetch instrument metadata
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
              tradeLicenseNo: instData?.trade_license_no || "DL-MCD-2025-REG",
              address: instData?.address || "Commercial Premises",
              district: instData?.district || certData.zone || "Central Delhi",
              state: instData?.state || "Delhi",
              pincode: instData?.pincode || "110001",
              instrumentType: (instData?.instrument_type as any) || "ELECTRONIC_COUNTER_SCALE",
              make: instData?.make || "Standard",
              model: instData?.model || "Scale-360",
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
            leadSealNumber: certData.lead_seal_number,
            hologramNumber: certData.hologram_number,
            certificateNumber: certData.certificate_number,
            stampingFeePaid: Number(certData.stamping_fee_paid || 200),
            sealImageUrl: certData.seal_image_url,
            gpsCoordinates: certData.gps_latitude && certData.gps_longitude ? {
              latitude: Number(certData.gps_latitude),
              longitude: Number(certData.gps_longitude),
              accuracy: 10,
            } : undefined,
          };

          setSession(assembledSession);
          setIsLoading(false);
          return;
        }

        // 2. Fallback: Query instruments table directly
        let instQuery = supabase.from("instruments").select("*");
        if (queryId) {
          instQuery = instQuery.or(`id.eq.${queryId},serial_number.eq.${queryId}`);
        } else {
          instQuery = instQuery.order("created_at", { ascending: false }).limit(1);
        }

        const { data: instDirect } = await instQuery.maybeSingle();

        if (instDirect) {
          const today = new Date(instDirect.created_at).toISOString().split("T")[0];
          const nextYear = new Date(new Date(instDirect.created_at).getTime() + 365 * 86400000).toISOString().split("T")[0];

          const generatedSession: InspectionSession = {
            instrument: {
              id: instDirect.id,
              applicationNo: `SM360-${instDirect.serial_number}`,
              traderName: instDirect.trader_name,
              businessName: instDirect.business_name || `${instDirect.trader_name} Firm`,
              tradeLicenseNo: instDirect.trade_license_no || "DL-MCD-2025-REG",
              address: instDirect.address || "Commercial Premises",
              district: instDirect.district || "Delhi",
              state: instDirect.state || "Delhi",
              pincode: instDirect.pincode || "110001",
              instrumentType: (instDirect.instrument_type as any) || "ELECTRONIC_COUNTER_SCALE",
              make: instDirect.make || "Standard",
              model: instDirect.model || "Scale-360",
              serialNumber: instDirect.serial_number,
              modelApprovalNo: instDirect.model_approval_no || "IND/01/2024/099",
              accuracyClass: (instDirect.accuracy_class as any) || "CLASS_III",
              maxCapacity: Number(instDirect.max_capacity) || 30,
              minCapacity: Number(instDirect.min_capacity) || 0.1,
              verificationInterval_e: Number(instDirect.verification_interval_e) || 0.005,
              scaleInterval_d: Number(instDirect.scale_interval_d) || 0.005,
              unit: (instDirect.unit as any) || "kg",
              verificationFee: Number(instDirect.stamping_fee || 200),
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
            certificateNumber: `LM/DL/SEC24/${new Date().getFullYear()}/${instDirect.serial_number.slice(-5)}`,
            stampingFeePaid: Number(instDirect.stamping_fee || 200),
          };

          setSession(generatedSession);
          setIsLoading(false);
          return;
        }

        setErrorMsg(
          queryId
            ? `No certificate or instrument found matching identifier "${queryId}" in live database.`
            : "No registered certificates found in the database. Please perform an inspection to generate a live certificate."
        );
      } catch (err: any) {
        setErrorMsg("Failed to connect to Supabase: " + (err?.message || "Network error"));
      } finally {
        setIsLoading(false);
      }
    }

    loadCertificate();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs text-slate-500 font-mono">Fetching certificate from live Supabase database...</span>
      </div>
    );
  }

  if (errorMsg || !session) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 shadow-sm">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Live Certificate Record</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">{errorMsg || "Record not available."}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (typeof window !== "undefined") window.location.href = "/";
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Return to Registry
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <CertificateView
        session={session}
        onBack={() => {
          if (typeof window !== "undefined") window.history.back();
        }}
      />
    </div>
  );
}
