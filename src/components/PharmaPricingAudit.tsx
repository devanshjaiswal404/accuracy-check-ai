import React, { useState, useRef, useEffect } from "react";
import {
  Pill,
  AlertOctagon,
  TrendingDown,
  IndianRupee,
  ShieldCheck,
  Save,
  RotateCcw,
  Sparkles,
  UploadCloud,
  Search,
  CheckCircle2,
  XCircle,
  FileDown,
  Camera,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportFormVNotice } from "@/components/EnforcementRegistryAnalytics";
import {
  auditMedicineWithAI,
  PharmaAuditResult,
} from "@/services/pharmaAudit";
import { cn } from "@/lib/utils";

export function PharmaPricingAudit() {
  const queryClient = useQueryClient();

  // Mode: 'input' | 'camera' | 'analyzing' | 'result'
  const [mode, setMode] = useState<"input" | "camera" | "analyzing" | "result">("input");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual Form State
  const [medicineName, setMedicineName] = useState("");
  const [stampedMrpInput, setStampedMrpInput] = useState("");
  const [packSizeInput, setPackSizeInput] = useState("10");

  // File upload / image state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Camera state & refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Final Audit Result
  const [auditResult, setAuditResult] = useState<PharmaAuditResult | null>(null);

  // Stop camera media stream cleanly
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Launch live camera
  const handleStartCamera = async () => {
    setCameraError(null);
    setErrorMessage(null);
    setMode("camera");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      const errMsg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera permissions or upload an image file."
          : "Could not access camera. Please upload an image file instead.";
      setCameraError(errMsg);
      toast.error(errMsg);
      stopCameraStream();
    }
  };

  // Capture frame from active camera
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Failed to capture image frame from camera");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    stopCameraStream();
    setImagePreview(dataUrl);
    setMode("input");
    toast.success("Medicine strip photo captured!");
  };

  // Close camera mode
  const handleCloseCamera = () => {
    stopCameraStream();
    setMode("input");
  };

  // Ingest uploaded image file
  const handleFileUpload = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      toast.error("Please upload a .jpg, .jpeg, .png, or .webp image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setErrorMessage(null);
      toast.success("Medicine strip image loaded. Click 'Run DPCO Compliance Audit' to inspect.");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Execute AI DPCO Audit
  const executeAudit = async (customImage?: string | null) => {
    const imgToUse = customImage !== undefined ? customImage : imagePreview;
    const parsedMrp = parseFloat(stampedMrpInput);
    const validMrp = isNaN(parsedMrp) || parsedMrp <= 0 ? undefined : parsedMrp;
    const validPackSize = parseInt(packSizeInput, 10) || 10;

    // Validate that either image or medicine name is provided
    if (!imgToUse && !medicineName.trim()) {
      toast.error("Please provide a medicine name or upload a strip photo.");
      return;
    }

    setErrorMessage(null);
    setMode("analyzing");

    try {
      const result = await auditMedicineWithAI(
        imgToUse,
        medicineName.trim() || undefined,
        validMrp,
        validPackSize
      );

      setAuditResult(result);
      setMode("result");
      toast.success("NPPA Ceiling & DPCO Para 16 Audit Complete!", {
        description: `${result.brandName} · ${result.isOvercharged ? "Overcharge Detected" : "Compliant"}`,
      });
    } catch (err: unknown) {
      console.error("DPCO Audit Error:", err);
      const msg =
        err instanceof Error ? err.message : "AI pharma pricing audit failed. Please try again.";
      setErrorMessage(msg);
      setMode("input");
      toast.error("Audit Failed", { description: msg });
    }
  };

  // Form submit handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAudit();
  };

  // Reset back to clean input view
  const handleReset = () => {
    stopCameraStream();
    setMode("input");
    setAuditResult(null);
    setImagePreview(null);
    setErrorMessage(null);
    setMedicineName("");
    setStampedMrpInput("");
    setPackSizeInput("10");
  };

  // Save DPCO record to Supabase
  const handleSaveToRegistry = async () => {
    if (!auditResult) return;
    setIsSaving(true);

    try {
      const isNonCompliant =
        auditResult.isOvercharged ||
        auditResult.scheduleHWarnStatus === "VIOLATION_MISSING" ||
        (auditResult.contraventions && auditResult.contraventions.length > 0);

      const status = isNonCompliant ? "NON_COMPLIANT" : "COMPLIANT";

      // 2. Prepare violation records
      const violationsToInsert: Array<{
        rule_clause: string;
        violation_title: string;
        severity: string;
        extracted_text: string;
        remediation: string;
      }> = [];

      if (auditResult.isOvercharged) {
        violationsToInsert.push({
          rule_clause: "DPCO 2013 · Para 16",
          violation_title: `Unlawful Overcharge Above NPPA Gazette Ceiling (₹${auditResult.stampedMrp.toFixed(2)} vs ₹${auditResult.nppaCeilingPrice.toFixed(2)})`,
          severity: "HIGH",
          extracted_text: `Overcharge of ₹${auditResult.excessPerStrip.toFixed(2)} / pack above NPPA statutory ceiling (₹${auditResult.nppaCeilingPrice.toFixed(2)}).`,
          remediation:
            "Remit commercial overcharged sum to Consumer Education and Protection Fund under Para 16.",
        });
      }

      if (auditResult.scheduleHWarnStatus === "VIOLATION_MISSING") {
        violationsToInsert.push({
          rule_clause: "Drugs & Cosmetics Rules · Schedule H / H1",
          violation_title: "Missing Mandatory Rx / Schedule H Caution Box",
          severity: "HIGH",
          extracted_text: "Packaging fails to display mandatory red caution box and Rx symbol.",
          remediation: "Halt retail distribution and reprint mandatory statutory caution box.",
        });
      }

      if (auditResult.contraventions && auditResult.contraventions.length > 0) {
        auditResult.contraventions.forEach((c) => {
          violationsToInsert.push({
            rule_clause: c.clause || "DPCO 2013",
            violation_title: c.description,
            severity: c.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
            extracted_text: c.description,
            remediation: "Comply with mandatory NPPA drug price control standards.",
          });
        });
      }

      // If marked non-compliant but no specific violations array generated, provide a fallback record
      if (isNonCompliant && violationsToInsert.length === 0) {
        violationsToInsert.push({
          rule_clause: "DPCO 2013 / Para 16",
          violation_title: "DPCO Statutory Pricing Contravention",
          severity: "HIGH",
          extracted_text: "Price or labeling contravention detected during DPCO pharmaceutical audit.",
          remediation: "Comply with mandatory NPPA drug price control standards under DPCO 2013.",
        });
      }

      const totalViolations = isNonCompliant ? Math.max(1, violationsToInsert.length) : violationsToInsert.length;

      // 1. Insert product record into inspected_products
      const { data: product, error: pError } = await supabase
        .from("inspected_products")
        .insert({
          product_name: `${auditResult.brandName} (${auditResult.dosageStrength})`,
          brand_name: auditResult.saltComposition,
          category: "Pharmaceutical",
          status,
          total_violations: totalViolations,
          image_url: imagePreview && imagePreview.length < 200000 ? imagePreview : null,
        })
        .select("id")
        .single();

      if (pError) throw pError;
      if (!product?.id) throw new Error("No database ID returned from Supabase");

      // 2. Insert violations into detected_violations
      if (violationsToInsert.length > 0) {
        const violationRecords = violationsToInsert.map((v) => ({
          product_id: product.id,
          rule_clause: v.rule_clause,
          violation_title: v.violation_title,
          severity: v.severity,
          extracted_text: v.extracted_text,
          remediation: v.remediation,
        }));

        const { error: vError } = await supabase
          .from("detected_violations")
          .insert(violationRecords);

        if (vError) throw vError;
      }

      toast.success(`DPCO Record Saved to Registry! (#${product.id.slice(0, 8)})`, {
        description: `${auditResult.brandName} · Status: ${status} (${totalViolations} violations)`,
      });

      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    } catch (err: unknown) {
      console.error("DPCO Save Error:", err);
      const msg = err instanceof Error ? err.message : "Failed to record DPCO notice";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Export legal notice PDF
  const handleExportPdf = () => {
    if (!auditResult) return;

    const isNonCompliant =
      auditResult.isOvercharged ||
      auditResult.scheduleHWarnStatus === "VIOLATION_MISSING" ||
      (auditResult.contraventions && auditResult.contraventions.length > 0);

    const status = isNonCompliant ? "NON_COMPLIANT" : "COMPLIANT";
    const violations: Array<{
      rule_clause: string;
      violation_title: string;
      severity: string;
      extracted_text: string;
      remediation: string;
    }> = [];

    if (auditResult.isOvercharged) {
      violations.push({
        rule_clause: "DPCO 2013 · Para 16",
        violation_title: `Unlawful Overcharge Above NPPA Ceiling (₹${auditResult.stampedMrp.toFixed(2)} vs ₹${auditResult.nppaCeilingPrice.toFixed(2)})`,
        severity: "HIGH",
        extracted_text: `Overcharge of ₹${auditResult.excessPerStrip.toFixed(2)} / pack above NPPA statutory ceiling (₹${auditResult.nppaCeilingPrice.toFixed(2)}).`,
        remediation: "Revise stamped retail price to compliant ceiling under Para 16.",
      });
    }

    if (auditResult.scheduleHWarnStatus === "VIOLATION_MISSING") {
      violations.push({
        rule_clause: "Drugs & Cosmetics Rules · Schedule H / H1",
        violation_title: "Missing Statutory Schedule H Caution Box",
        severity: "HIGH",
        extracted_text: "Mandatory prescription caution box omitted on blister strip.",
        remediation: "Corrective overprinting or immediate stock recall.",
      });
    }

    if (auditResult.contraventions) {
      auditResult.contraventions.forEach((c) => {
        violations.push({
          rule_clause: c.clause || "DPCO 2013",
          violation_title: c.description,
          severity: c.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
          extracted_text: c.description,
          remediation: "Ensure compliance with notified ceiling rates.",
        });
      });
    }

    if (isNonCompliant && violations.length === 0) {
      violations.push({
        rule_clause: "DPCO 2013 / Para 16",
        violation_title: "DPCO Statutory Pricing Contravention",
        severity: "HIGH",
        extracted_text: "Price or labeling contravention detected during DPCO pharmaceutical audit.",
        remediation: "Comply with mandatory NPPA drug price control standards under DPCO 2013.",
      });
    }

    const totalViolations = isNonCompliant ? Math.max(1, violations.length) : violations.length;

    exportFormVNotice(
      {
        id: `dpco-${Date.now()}`,
        product_name: `${auditResult.brandName} (${auditResult.dosageStrength})`,
        brand_name: auditResult.saltComposition,
        category: "Pharmaceutical",
        status,
        total_violations: totalViolations,
        created_at: new Date().toISOString(),
      },
      violations
    );
  };

  // Calculate savings percentage vs PMBJP Jan Aushadhi
  const savingsPercent =
    auditResult && auditResult.stampedMrp > 0
      ? Math.max(
          0,
          Math.round(
            ((auditResult.stampedMrp - auditResult.janAushadhiPrice) /
              auditResult.stampedMrp) *
              100
          )
        )
      : 0;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes sweepLine {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 96%; opacity: 1; }
          100% { top: 0%; opacity: 0.8; }
        }
        .animate-scan-sweep {
          animation: sweepLine 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".jpg,.jpeg,.png,.webp,image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
          if (e.target) e.target.value = "";
        }}
        className="hidden"
      />

      {/* Offscreen canvas for camera snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Pharmaceutical Pricing & DPCO Compliance Audit
                </h1>
                <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400">
                  DPCO, 2013 · NPPA
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Audit maximum retail price against NPPA statutory ceilings and verify Schedule H warnings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              NPPA SCHEDULE I ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-500/40 dark:bg-rose-950/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-rose-900 dark:text-rose-200">
                  Pharmaceutical Pricing Audit Error
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 font-mono max-w-2xl break-words">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => executeAudit()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-rose-500 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Audit
              </button>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-slate-800 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. INITIAL INPUT VIEW */}
      {mode === "input" && (
        <div className="grid gap-6 md:grid-cols-12">
          {/* Option 1: Medicine Strip Photo Ingestion */}
          <div className="md:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-[380px]">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Strip Photo Ingestion
                  </h3>
                </div>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="text-xs text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Clear Photo
                  </button>
                )}
              </div>

              {imagePreview ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-inner">
                  <img
                    src={imagePreview}
                    alt="Medicine Blister Strip Preview"
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 px-2.5 py-1 text-center font-mono text-[10px] text-emerald-400 backdrop-blur-md">
                    Specimen photo loaded & ready for OCR
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "group flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer min-h-[200px]",
                    isDragging
                      ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/30 dark:bg-indigo-500/10 dark:ring-indigo-500/40 shadow-lg shadow-indigo-500/10"
                      : "bg-slate-50/50 border-slate-300 hover:border-indigo-500 dark:bg-slate-950/40 dark:border-slate-800 dark:hover:border-indigo-500"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 transition-transform group-hover:scale-110 shadow-sm">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <h4 className="mt-3 font-display text-xs font-bold text-slate-800 dark:text-slate-200">
                    Drag and drop strip photograph here
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    or <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline">browse files</span> (.jpg, .png, .webp)
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleStartCamera}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 font-display text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Camera className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Capture with Live Camera
              </button>
            </div>
          </div>

          {/* Option 2: Manual Input Option */}
          <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-[380px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <Search className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Medicine Formulation Details
                </h2>
              </div>

              <form onSubmit={handleFormSubmit} id="pharma-form" className="space-y-4">
                {/* Field 1: Medicine / Brand Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Medicine / Brand Name (Optional if photo attached)
                  </label>
                  <input
                    type="text"
                    value={medicineName}
                    onChange={(e) => setMedicineName(e.target.value)}
                    placeholder="e.g., Augmentin 625, Pantocid 40, Dolo 650, Lipitor 10mg"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Field 2: Stamped MRP */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Stamped MRP on Strip (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={stampedMrpInput}
                        onChange={(e) => setStampedMrpInput(e.target.value)}
                        placeholder="e.g., 112.50"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Field 3: Pack Size */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Pack Size (Units)
                    </label>
                    <input
                      type="number"
                      value={packSizeInput}
                      onChange={(e) => setPackSizeInput(e.target.value)}
                      placeholder="10"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Run DPCO Compliance Audit Action Button */}
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                form="pharma-form"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-indigo-600/30 transition-all hover:bg-indigo-500 hover:scale-[1.01]"
              >
                <Sparkles className="h-4 w-4" />
                Run DPCO Compliance Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CAMERA INGESTION VIEW */}
      {mode === "camera" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Live Blister Strip Camera Active
              </span>
            </div>

            <button
              type="button"
              onClick={handleCloseCamera}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
              Close Camera
            </button>
          </div>

          {cameraError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/20 dark:text-rose-300 space-y-4">
              <AlertTriangle className="mx-auto h-10 w-10 text-rose-500 dark:text-rose-400" />
              <p className="text-sm font-semibold">{cameraError}</p>
              <button
                type="button"
                onClick={() => setMode("input")}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs text-white"
              >
                Return to Input Screen
              </button>
            </div>
          ) : (
            <div className="relative aspect-[16/9] sm:aspect-[4/3] max-h-[500px] w-full overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-800 bg-black shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Target Frame Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-56 w-96 max-w-[85%] border-2 border-dashed border-indigo-400/70 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.25)]">
                  <div className="absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-indigo-400" />
                  <div className="absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-indigo-400" />
                  <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-indigo-400" />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-indigo-400" />

                  <div className="absolute -bottom-8 inset-x-0 text-center font-mono text-[10px] text-indigo-200 font-bold tracking-wider bg-black/70 py-0.5 px-3 rounded-full backdrop-blur-sm">
                    ALIGN MEDICINE BLISTER STRIP / MRP STAMP HERE
                  </div>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-4 z-20">
                <button
                  type="button"
                  onClick={handleCloseCamera}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 backdrop-blur-md transition-all shadow-md"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-xl shadow-indigo-600/40 transition-all hover:bg-indigo-500 hover:scale-105"
                >
                  <Camera className="h-4 w-4" />
                  Capture Strip Photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ANALYZING / PROCESSING RADAR STATE */}
      {mode === "analyzing" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-8 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-950/20 dark:shadow-xl backdrop-blur-md">
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-300 dark:border-indigo-500/30 border-t-indigo-600 dark:border-t-indigo-500 animate-spin" />
                <Pill className="absolute inset-0 m-auto h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>

              <div className="space-y-1.5 max-w-lg">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                  Consulting NPPA DPCO 2013 Database & PMBJP Price Schedules...
                </h3>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-mono">
                  Cross-referencing statutory ceiling price schedules, Jan Aushadhi generic alternatives, and Schedule H prescription warnings.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 bg-white dark:bg-slate-900 dark:text-slate-400 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-indigo-500 dark:bg-cyan-400 animate-ping" />
                Enforcement Audit Engine: Active
              </div>
            </div>
          </div>

          {/* Radar Scanning Line Layer if Image Present */}
          {imagePreview && (
            <div className="relative aspect-[16/9] sm:aspect-[4/3] max-h-[440px] w-full overflow-hidden rounded-2xl border border-indigo-500/40 bg-slate-950 shadow-2xl">
              <img
                src={imagePreview}
                alt="Medicine Specimen under scan"
                className="h-full w-full object-contain filter brightness-90 contrast-105"
              />

              {/* Cyan Laser Radar Sweep Line */}
              <div className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-scan-sweep" />

              <div className="pointer-events-none absolute inset-0 bg-indigo-950/20 backdrop-contrast-110" />

              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-[10px] font-mono text-cyan-300 backdrop-blur-md border border-cyan-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                OCR EXTRACTING STAMPED MRP & RED BOX WARNING
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. LIVE RESULTS DISPLAY */}
      {mode === "result" && auditResult && (
        <div className="space-y-6">
          {/* Top Result Navigation Strip & Product Badge */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {auditResult.brandName}
                  </span>
                  <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300">
                    {auditResult.dosageStrength}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Active Salt: </span>
                  {auditResult.saltComposition} · Pack of {auditResult.packSize} Units
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm"
            >
              <RotateCcw className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              Audit Another Medicine
            </button>
          </div>

          {/* Primary Verdict Banner */}
          <div
            className={cn(
              "rounded-2xl border p-5 shadow-sm dark:shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-4",
              auditResult.isOvercharged
                ? "border-rose-200 bg-rose-50/80 dark:border-rose-500/40 dark:bg-rose-950/30"
                : "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/40 dark:bg-emerald-950/30"
            )}
          >
            <div className="flex items-center gap-3.5">
              {auditResult.isOvercharged ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40">
                  <AlertOctagon className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Statutory Pricing Verdict
                </span>
                <div
                  className={cn(
                    "font-display text-base sm:text-lg font-bold tracking-wider",
                    auditResult.isOvercharged
                      ? "text-rose-700 dark:text-rose-400"
                      : "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {auditResult.isOvercharged
                    ? "NON-COMPLIANT: DPCO Paragraph 16 Violation — Overcharging Detected"
                    : "COMPLIANT: Stamped MRP is within NPPA Statutory Ceiling"}
                </div>
              </div>
            </div>

            {/* Schedule H Prescription Warning Status Pill */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wider shadow-sm",
                  auditResult.scheduleHWarnStatus === "COMPLIANT"
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : auditResult.scheduleHWarnStatus === "VIOLATION_MISSING"
                    ? "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400"
                    : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                {auditResult.scheduleHWarnStatus === "COMPLIANT" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Schedule H Caution Box: Verified
                  </>
                ) : auditResult.scheduleHWarnStatus === "VIOLATION_MISSING" ? (
                  <>
                    <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    Missing Mandatory Rx / Schedule H Box
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-slate-500" />
                    OTC / Non-Scheduled Drug
                  </>
                )}
              </span>
            </div>
          </div>

          {/* 3-Way Live Price Parity Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1: Stamped MRP on Strip */}
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 shadow-sm dark:bg-rose-950/30 dark:border-rose-800">
              <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
                <span className="font-semibold uppercase tracking-wider">
                  1. Stamped MRP on Strip
                </span>
                <span className="font-mono text-[11px] text-rose-700/80 dark:text-rose-300/80">Physical Strip</span>
              </div>
              <div
                className={cn(
                  "mt-3 font-display text-3xl font-black",
                  auditResult.isOvercharged ? "text-rose-600 dark:text-rose-400" : "text-rose-900 dark:text-rose-200"
                )}
              >
                ₹{auditResult.stampedMrp.toFixed(2)}
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-rose-700/80 dark:text-rose-300/80">
                For {auditResult.packSize} units (₹{(auditResult.stampedMrp / auditResult.packSize).toFixed(2)} / unit)
              </div>
            </div>

            {/* Card 2: NPPA Statutory Ceiling */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 shadow-sm dark:bg-slate-950 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold uppercase tracking-wider">
                  2. NPPA Statutory Ceiling
                </span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">Govt Gazette Limit</span>
              </div>
              <div className="mt-3 font-display text-3xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{auditResult.nppaCeilingPrice.toFixed(2)}
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                Max legally permissible under DPCO 2013
              </div>
            </div>

            {/* Card 3: Jan Aushadhi (PMBJP) Generic Alternative Price */}
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 shadow-sm dark:bg-emerald-950/30 dark:border-emerald-800">
              <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold uppercase tracking-wider">
                  3. Jan Aushadhi (PMBJP)
                </span>
                {savingsPercent > 0 && (
                  <span className="rounded-full bg-emerald-200/80 dark:bg-emerald-800/60 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                    {savingsPercent}% Cheaper
                  </span>
                )}
              </div>
              <div className="mt-3 font-display text-3xl font-black text-emerald-700 dark:text-emerald-300">
                ₹{auditResult.janAushadhiPrice.toFixed(2)}
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                Official PMBJP Generic Kendra rate
              </div>
            </div>
          </div>

          {/* Contraventions & Remediations List */}
          {auditResult.contraventions && auditResult.contraventions.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Detected Statutory Contraventions ({auditResult.contraventions.length})
              </span>

              <div className="space-y-2">
                {auditResult.contraventions.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/40 dark:bg-rose-950/20"
                  >
                    <div className="space-y-0.5">
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-display text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mr-2">
                        {item.clause}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                        {item.description}
                      </span>
                    </div>

                    <span className="self-start sm:self-auto rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 px-2 py-0.5 font-mono text-[9px] font-bold uppercase">
                      {item.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>
                Synchronizes with Supabase inspected_products & detected_violations.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportPdf}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm"
              >
                <FileDown className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                Export Notice (PDF)
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveToRegistry}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Pharma Audit to Supabase Registry
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PharmaPricingAudit;
