import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  UploadCloud,
  Camera,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  FileDown,
  Eye,
  Sparkles,
  Loader2,
  X,
  Scan,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportFormVNotice } from "@/components/EnforcementRegistryAnalytics";
import {
  analyzePackagingWithAI,
  RealScanResult,
  RealBoundingBox,
} from "@/services/geminiVision";
import { cn } from "@/lib/utils";

// Backwards compatibility re-exports
export type ClauseStatus = "pass" | "violation";
export type SeverityLevel = "HIGH" | "MEDIUM" | "LOW";

const HUD_STATUS_CHIPS = [
  "Extracting statutory declarations under LMPC Rules, 2011...",
  "Verifying pre-printed artwork vs inkjet stamping window...",
  "Cross-referencing Section 18 statutory score...",
];

export function PhysicalPackageScanner() {
  const queryClient = useQueryClient();

  // Core scanner states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentScan, setCurrentScan] = useState<RealScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeHudStep, setActiveHudStep] = useState(0);

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Cycle HUD status chips while analyzing
  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setActiveHudStep((prev) => (prev + 1) % HUD_STATUS_CHIPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Stop camera media stream cleanly
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Launch live camera
  const handleStartCamera = async () => {
    setCameraError(null);
    setErrorMessage(null);
    setIsCameraActive(true);

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
      console.error("Camera access failed:", err);
      const errMsg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access or upload an image file."
          : "Could not access device camera. Please upload an image file instead.";
      setCameraError(errMsg);
      toast.error(errMsg);
      stopCameraStream();
    }
  };

  // Ingest image via Real AI Vision Service
  const runAiAnalysis = async (base64DataUrl: string) => {
    setImagePreview(base64DataUrl);
    setErrorMessage(null);
    setIsAnalyzing(true);
    setCurrentScan(null);
    setActiveHudStep(0);

    try {
      const scanResult = await analyzePackagingWithAI(base64DataUrl);
      setCurrentScan(scanResult);
      toast.success("Packaging Audit Complete!", {
        description: `${scanResult.productName} · Score: ${scanResult.score}/100`,
      });
    } catch (err: unknown) {
      console.error("Packaging Analysis Error:", err);
      const msg =
        err instanceof Error ? err.message : "AI vision inspection failed due to a network or server error.";
      setErrorMessage(msg);
      toast.error("AI Analysis Failed", { description: msg });
    } finally {
      setIsAnalyzing(false);
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
    runAiAnalysis(dataUrl);
  };

  // Close camera mode
  const handleCloseCamera = () => {
    stopCameraStream();
  };

  // Handle Drag & Drop events
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

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processSelectedFile(files[0]);
    }
    if (e.target) e.target.value = "";
  };

  const processSelectedFile = (file: File) => {
    const validExtensions = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validExtensions.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      toast.error("Unsupported file format. Please upload a .jpg, .jpeg, .png, or .webp image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        runAiAnalysis(dataUrl);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Reset back to upload view
  const handleResetScan = () => {
    stopCameraStream();
    setImagePreview(null);
    setCurrentScan(null);
    setErrorMessage(null);
    setHoveredBoxId(null);
    setIsAnalyzing(false);
  };

  // Retry failed analysis with same image
  const handleRetryAnalysis = () => {
    if (imagePreview) {
      runAiAnalysis(imagePreview);
    }
  };

  // Save inspection to Supabase
  const handleSaveToRegistry = async () => {
    if (!currentScan) return;
    setIsSaving(true);

    const detectedViolations = currentScan.boxes.filter((b) => !b.isCompliant);
    const isNonCompliant =
      currentScan.status === "NON_COMPLIANT" ||
      detectedViolations.length > 0;

    // Ensure non-compliant products always have at least 1 violation record mapped
    const finalViolations = [...detectedViolations];
    if (isNonCompliant && finalViolations.length === 0) {
      finalViolations.push({
        id: "statutory-v1",
        label: currentScan.isInkjetMissing
          ? "Missing Mandatory Inkjet Stamped Coding Window"
          : "Legal Metrology Act Section 15 / Rule 6 Contravention",
        ruleClause: "Rule 6 / Section 15",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        isCompliant: false,
        extractedValue: currentScan.isInkjetMissing
          ? "Missing Lot / Mfd / Expiry / MRP Stamping"
          : "Statutory packaging non-compliance detected under LMPC Rules 2011",
        severity: "HIGH",
        remediation: "Comply with mandatory Legal Metrology (Packaged Commodities) Rules, 2011.",
      });
    }

    const totalViolations = isNonCompliant ? Math.max(1, finalViolations.length) : finalViolations.length;
    const finalStatus = isNonCompliant ? "NON_COMPLIANT" : "COMPLIANT";

    try {
      // 1. Insert product record into inspected_products
      const { data: product, error: pError } = await supabase
        .from("inspected_products")
        .insert({
          product_name: currentScan.productName,
          brand_name: currentScan.brandName,
          category: currentScan.category,
          image_url: currentScan.imageUrl.length < 200000 ? currentScan.imageUrl : null,
          status: finalStatus,
          total_violations: totalViolations,
        })
        .select("id")
        .single();

      if (pError) throw pError;
      if (!product?.id) throw new Error("No record ID returned from database");

      // 2. Insert violation records into detected_violations
      if (finalViolations.length > 0) {
        const violationRecords = finalViolations.map((v) => ({
          product_id: product.id,
          rule_clause: v.ruleClause || "Rule 6",
          violation_title: v.label || "Packaging Contravention",
          severity: v.severity || "HIGH",
          extracted_text: v.extractedValue || "Non-compliant packaging declaration",
          remediation: v.remediation || "Comply with mandatory Legal Metrology (Packaged Commodities) Rules, 2011.",
        }));

        const { error: vError } = await supabase
          .from("detected_violations")
          .insert(violationRecords);

        if (vError) throw vError;
      }

      toast.success(`Inspection recorded in Supabase! (ID: #${product.id.slice(0, 8)})`, {
        description: `${currentScan.productName} · ${finalStatus} (${totalViolations} violations)`,
      });

      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    } catch (err: unknown) {
      console.error("Supabase Registry Save Error:", err);
      const message = err instanceof Error ? err.message : "Failed to record inspection in registry";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Export legal Form V notice
  const handleExportPdf = () => {
    if (!currentScan) return;
    const detectedViolations = currentScan.boxes.filter((b) => !b.isCompliant);
    const isNonCompliant =
      currentScan.status === "NON_COMPLIANT" ||
      detectedViolations.length > 0;

    const finalViolations = [...detectedViolations];
    if (isNonCompliant && finalViolations.length === 0) {
      finalViolations.push({
        id: "statutory-v1",
        label: currentScan.isInkjetMissing
          ? "Missing Mandatory Inkjet Stamped Coding Window"
          : "Legal Metrology Act Section 15 / Rule 6 Contravention",
        ruleClause: "Rule 6 / Section 15",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        isCompliant: false,
        extractedValue: currentScan.isInkjetMissing
          ? "Missing Lot / Mfd / Expiry / MRP Stamping"
          : "Statutory packaging non-compliance detected under LMPC Rules 2011",
        severity: "HIGH",
        remediation: "Ensure mandatory statutory labeling under Legal Metrology Rules, 2011.",
      });
    }

    const totalViolations = isNonCompliant ? Math.max(1, finalViolations.length) : finalViolations.length;
    const finalStatus = isNonCompliant ? "NON_COMPLIANT" : "COMPLIANT";

    exportFormVNotice(
      {
        id: `scan-${Date.now()}`,
        product_name: currentScan.productName,
        brand_name: currentScan.brandName,
        category: currentScan.category,
        status: finalStatus,
        total_violations: totalViolations,
        created_at: new Date().toISOString(),
      },
      finalViolations.map((v) => ({
        rule_clause: v.ruleClause || "Rule 6",
        violation_title: v.label || "Packaging Contravention",
        severity: v.severity || "HIGH",
        extracted_text: v.extractedValue || "Non-compliant packaging declaration",
        remediation: v.remediation || "Ensure mandatory statutory labeling under Legal Metrology Rules, 2011.",
      }))
    );
  };

  const violations = useMemo(
    () => currentScan?.boxes.filter((b) => !b.isCompliant) || [],
    [currentScan]
  );
  const passCount = useMemo(
    () => currentScan?.boxes.filter((b) => b.isCompliant).length || 0,
    [currentScan]
  );

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
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Canvas for camera snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* VIEW 1: IDLE / PACKAGING INGESTION ZONE */}
      {!isCameraActive && !isAnalyzing && !currentScan && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
                  <Scan className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      Physical Package Scanner & Stamping OCR
                    </h1>
                    <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400">
                      Gemini 2.0 Flash Vision
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Real-time Principal Display Panel (PDP) inspection, mandatory clause recognition, and anti-hallucination stamping integrity verification.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  AI VISION READY
                </span>
              </div>
            </div>
          </div>

          {/* Prominent Error Banner if previous scan failed */}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-500/40 dark:bg-rose-950/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-rose-900 dark:text-rose-200">
                      AI Vision Inspection Failed
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 font-mono max-w-2xl break-words">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRetryAnalysis}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-rose-500 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry Analysis
                    </button>
                  )}
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

          {/* Ingestion Cards */}
          <div className="grid gap-6 md:grid-cols-12">
            {/* Main Drag & Drop Zone */}
            <div className="md:col-span-8">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer min-h-[320px]",
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/30 dark:bg-indigo-500/10 dark:ring-indigo-500/40 shadow-lg shadow-indigo-500/10"
                    : "bg-slate-50/50 border-slate-300 hover:border-indigo-500 dark:bg-slate-950/40 dark:border-slate-800 dark:hover:border-indigo-500"
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 transition-transform group-hover:scale-110 shadow-sm">
                  <UploadCloud className="h-8 w-8" />
                </div>

                <h3 className="mt-4 font-display text-base font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                  Drag and drop packaging photograph here
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                  or <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline underline-offset-2">browse from your computer</span> to upload specimen image
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900">.JPG</span>
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900">.JPEG</span>
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900">.PNG</span>
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900">.WEBP</span>
                </div>
              </div>
            </div>

            {/* Live Camera Option Card */}
            <div className="md:col-span-4 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-[320px]">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 mb-4">
                  <Camera className="h-6 w-6" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white tracking-wide">
                  Live Camera Ingestion
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Use your device camera or attached USB document scanner to photograph retail packaging on-site in real time.
                </p>

                <div className="mt-4 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Instant high-resolution OCR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Real-time crosshair alignment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Auto-calibrated SI unit checks</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartCamera}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500"
              >
                <Camera className="h-4 w-4" />
                Open Live Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LIVE CAMERA STREAM */}
      {isCameraActive && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Live Camera Ingestion Active
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
                onClick={() => setIsCameraActive(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs text-white"
              >
                Return to File Upload
              </button>
            </div>
          ) : (
            <div className="relative aspect-[16/9] sm:aspect-[4/3] max-h-[520px] w-full overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-800 bg-black shadow-2xl">
              {/* Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Crosshair Overlay Layer */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-64 w-80 max-w-[85%] border-2 border-dashed border-indigo-400/70 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  {/* Corners */}
                  <div className="absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-indigo-400" />
                  <div className="absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-indigo-400" />
                  <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-indigo-400" />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-indigo-400" />

                  {/* Center Crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-4 relative">
                      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-indigo-400" />
                      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-indigo-400" />
                    </div>
                  </div>

                  <div className="absolute -bottom-8 inset-x-0 text-center font-mono text-[10px] text-indigo-200 font-bold tracking-wider bg-black/70 py-0.5 px-3 rounded-full backdrop-blur-sm">
                    ALIGN PRINCIPAL DISPLAY PANEL (PDP) HERE
                  </div>
                </div>
              </div>

              {/* Floating Camera Capture Controls */}
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
                  Capture Specimen Photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: DYNAMIC AI SCANNING & LASER SWEEP LAYER */}
      {isAnalyzing && (
        <div className="space-y-6">
          {/* Header Status & HUD Chips */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-6 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-950/20 dark:shadow-xl backdrop-blur-md">
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-2">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-300 dark:border-indigo-500/30 border-t-indigo-600 dark:border-t-indigo-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>

              <div className="space-y-1.5 max-w-lg">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                  Gemini AI Inspecting Principal Display Panel (PDP)...
                </h3>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-mono">
                  Auditing statutory labeling, SI unit specifications, and stamping integrity under Legal Metrology Rules, 2011.
                </p>
              </div>

              {/* Live Audit HUD with 3 status chips */}
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 pt-2">
                {HUD_STATUS_CHIPS.map((chip, idx) => {
                  const isActive = activeHudStep === idx;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-mono transition-all duration-300 border",
                        isActive
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/30 font-semibold"
                          : "bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isActive ? "bg-white animate-ping" : "bg-slate-300 dark:bg-slate-700"
                        )}
                      />
                      <span>{chip}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Visual Scanning View with Animated Radar Line */}
          {imagePreview && (
            <div className="relative aspect-[16/9] sm:aspect-[4/3] max-h-[460px] w-full overflow-hidden rounded-2xl border border-indigo-500/40 bg-slate-950 shadow-2xl">
              <img
                src={imagePreview}
                alt="Specimen under scan"
                className="h-full w-full object-contain filter brightness-90 contrast-105"
              />

              {/* Cyan Laser Radar Sweep Line */}
              <div className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-scan-sweep" />

              {/* Translucent HUD Grid overlay */}
              <div className="pointer-events-none absolute inset-0 bg-indigo-950/20 backdrop-contrast-110" />

              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-[10px] font-mono text-cyan-300 backdrop-blur-md border border-cyan-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                AI VISION ANALYSIS IN PROGRESS
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: REAL EXTRACTED COMPLIANCE REPORT VIEW */}
      {!isAnalyzing && currentScan && (
        <div className="space-y-6">
          {/* Top Report Navigation Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Inspected Specimen:
                  </span>
                  <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {currentScan.productName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentScan.brandName} · {currentScan.category}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetScan}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm"
              >
                <RotateCcw className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                Scan Another Specimen
              </button>
            </div>
          </div>

          {/* Anti-Hallucination Stamping Warning Banner (if detected) */}
          {currentScan.isInkjetMissing && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/30">
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                      Anti-Hallucination Guard: Blank Stamping Area Flagged
                    </span>
                    <span className="rounded-full bg-amber-200/60 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                      Rule 6(1)(d)
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900 dark:text-slate-300">
                    Blank Inkjet Window: Stamped MFD/EXP/Batch missing under Rule 6(1)(d). The packaging specimen has a blank stamping area without mandatory batch code or manufacturing date.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Report Grid: Evidence Image + Statutory Score Breakdown */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: Visual Canvas with Real Interactive SVG Bounding Boxes */}
            <div className="space-y-3 lg:col-span-6 xl:col-span-7">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="font-display text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    Packaging Visual Evidence Layer
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  Hover box or card to inspect
                </span>
              </div>

              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-800/80 dark:bg-slate-950">
                {/* Base Packaging Image */}
                <img
                  src={currentScan.imageUrl}
                  alt={currentScan.productName}
                  className="h-full w-full object-contain select-none"
                />

                {/* Interactive SVG Bounding Box Layer */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full pointer-events-none"
                >
                  {currentScan.boxes.map((box) => {
                    const isHovered = hoveredBoxId === box.id;
                    const isCompliant = box.isCompliant;

                    return (
                      <g
                        key={box.id}
                        className="pointer-events-auto cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredBoxId(box.id)}
                        onMouseLeave={() => setHoveredBoxId(null)}
                      >
                        <rect
                          x={box.x}
                          y={box.y}
                          width={box.width}
                          height={box.height}
                          rx="1.5"
                          ry="1.5"
                          fill={
                            isCompliant
                              ? isHovered
                                ? "rgba(16, 185, 129, 0.3)"
                                : "rgba(16, 185, 129, 0.12)"
                              : isHovered
                              ? "rgba(244, 63, 94, 0.35)"
                              : "rgba(244, 63, 94, 0.14)"
                          }
                          stroke={isCompliant ? "#10b981" : "#f43f5e"}
                          strokeWidth={isHovered ? "2.5" : "1.5"}
                          strokeDasharray={isCompliant ? "none" : "3.5 1.5"}
                          style={{
                            filter: isHovered
                              ? isCompliant
                                ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.7))"
                                : "drop-shadow(0 0 8px rgba(244, 63, 94, 0.7))"
                              : "none",
                          }}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Floating HTML Dynamic Labels */}
                {currentScan.boxes.map((box) => {
                  const isHovered = hoveredBoxId === box.id;
                  const isCompliant = box.isCompliant;

                  return (
                    <div
                      key={`tag-${box.id}`}
                      onMouseEnter={() => setHoveredBoxId(box.id)}
                      onMouseLeave={() => setHoveredBoxId(null)}
                      className={cn(
                        "pointer-events-auto absolute cursor-pointer rounded-md px-2 py-0.5 font-mono text-[9px] font-bold tracking-wide transition-all duration-150 shadow-md",
                        isCompliant
                          ? "bg-emerald-600 text-white shadow-emerald-950/50"
                          : "bg-rose-600 text-white shadow-rose-950/50",
                        isHovered ? "scale-105 z-20 ring-2 ring-white/80" : "z-10 opacity-95"
                      )}
                      style={{
                        left: `${box.x}%`,
                        top: `max(2px, ${box.y - 4}%)`,
                      }}
                    >
                      <span className="flex items-center gap-1">
                        {isCompliant ? (
                          <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5 shrink-0" />
                        )}
                        {box.ruleClause} · {box.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Compliant Declaration
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Statutory Violation
                  </span>
                </div>
                <span className="font-mono text-[11px]">LMPC Rules, 2011</span>
              </div>
            </div>

            {/* Right Column: Statutory Score Card & Real Extracted Declarations */}
            <div className="space-y-4 lg:col-span-6 xl:col-span-5">
              {/* Prominent Statutory Verdict Card */}
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm dark:shadow-lg backdrop-blur-md transition-all",
                  currentScan.status === "COMPLIANT"
                    ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/40 dark:bg-emerald-950/30"
                    : "border-rose-200 bg-rose-50/80 dark:border-rose-500/40 dark:bg-rose-950/30"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {currentScan.status === "COMPLIANT" ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Statutory Verdict
                      </span>
                      <div
                        className={cn(
                          "font-display text-lg font-bold tracking-wider",
                          currentScan.status === "COMPLIANT"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        )}
                      >
                        {currentScan.status === "COMPLIANT"
                          ? `Score: ${currentScan.score}/100 · PASS`
                          : `Score: ${currentScan.score}/100 · ${violations.length} VIOLATIONS DETECTED`}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {currentScan.productName} · {currentScan.brandName}
                  </div>
                </div>

                {/* Verdict Badge */}
                <span
                  className={cn(
                    "rounded-full px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider shadow-sm",
                    currentScan.status === "COMPLIANT"
                      ? "bg-emerald-600 text-white shadow-emerald-900/30"
                      : "bg-rose-600 text-white shadow-rose-900/30"
                  )}
                >
                  {currentScan.status}
                </span>
              </div>

              {/* Extracted Statutory Declarations & Contraventions List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Extracted Declarations ({currentScan.boxes.length})
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {passCount} Pass · {violations.length} Violations
                  </span>
                </div>

                <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  {currentScan.boxes.map((box) => {
                    const isHovered = hoveredBoxId === box.id;
                    const isCompliant = box.isCompliant;

                    return (
                      <div
                        key={box.id}
                        onMouseEnter={() => setHoveredBoxId(box.id)}
                        onMouseLeave={() => setHoveredBoxId(null)}
                        className={cn(
                          "cursor-pointer rounded-xl border p-3.5 transition-all duration-150 shadow-sm",
                          isCompliant
                            ? isHovered
                              ? "bg-emerald-100/80 border-emerald-300 dark:border-emerald-500/60 dark:bg-emerald-950/40"
                              : "bg-emerald-50/60 border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                            : isHovered
                            ? "bg-rose-100/80 border-rose-300 dark:border-rose-500/60 dark:bg-rose-950/40"
                            : "bg-rose-50/60 border-rose-200 dark:border-rose-900/50 dark:bg-rose-950/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                {box.ruleClause}
                              </span>
                              <span className="font-display text-xs font-semibold text-slate-900 dark:text-slate-200">
                                {box.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase",
                                isCompliant
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                  : "bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
                              )}
                            >
                              {isCompliant ? "PASS" : "VIOLATION"}
                            </span>
                          </div>
                        </div>

                        {/* Extracted Text */}
                        <div className="mt-2 rounded-lg bg-white dark:bg-slate-950/60 p-2 font-mono text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/40">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Extracted Value: </span>
                          <span className="text-slate-900 dark:text-slate-200">{box.extractedValue}</span>
                        </div>

                        {/* Remediation Text for Violations */}
                        {box.remediation && (
                          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/90 p-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200/90">
                            <span className="font-semibold text-amber-800 dark:text-amber-400">Remediation: </span>
                            {box.remediation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Dual CTAs + Scan Another */}
              <div className="pt-2 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Primary Action Button: Save to Supabase */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveToRegistry}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-indigo-600/30 transition-all hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving to DB...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save to Supabase
                      </>
                    )}
                  </button>

                  {/* Secondary Action Button: Court-Ready PDF */}
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm"
                  >
                    <FileDown className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                    Export Notice (PDF)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetScan}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Scan Another Specimen
                </button>

                <div className="flex items-center justify-center gap-1.5 text-center font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                  Live Gemini 2.0 Flash Vision · Synced with Supabase Registry
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhysicalPackageScanner;
