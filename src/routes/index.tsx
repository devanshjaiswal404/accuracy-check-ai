import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  CircleCheck,
  CircleX,
  Clock3,
  FileDown,
  ImagePlus,
  RotateCcw,
  Save,
  ScanLine,
  Video,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { saveInspection } from "@/lib/inspections.functions";
import { useLang } from "@/lib/i18n";
import {
  analyze,
  customPack,
  deriveStatus,
  SAMPLES,
  type BoundingBox,
  type ClauseCheck,
  type ImageTab,
  type PackInput,
} from "@/lib/metrology";
import { buildNoticePdf } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MetrologyCheck AI — New Inspection" },
      {
        name: "description",
        content:
          "Run a statutory pack-label audit under the LMPC Rules 2011: capture evidence, review the clause checklist and save the inspection.",
      },
      { property: "og:title", content: "MetrologyCheck AI — New Inspection" },
      {
        property: "og:description",
        content: "Capture pack evidence, run the clause-by-clause LMPC 2011 audit and export an official notice.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const TABS: { id: ImageTab; key: string }[] = [
  { id: "front", key: "tabs.front" },
  { id: "back", key: "tabs.back" },
  { id: "panel", key: "tabs.panel" },
];

const chipStyles: Record<ClauseCheck["status"], string> = {
  pass: "border-pass/50 bg-pass-soft text-pass",
  violation: "border-fail/50 bg-fail-soft text-fail",
  review: "border-warn/50 bg-warn-soft text-warn",
};

const chipLabels: Record<ClauseCheck["status"], string> = {
  pass: "PASS",
  violation: "VIOLATION",
  review: "REVIEW",
};

function MockLabel({ lines, title }: { lines: string[]; title: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg bg-label-paper p-6 font-mono text-xs leading-relaxed text-label-ink shadow-lg">
        <div className="mb-3 border-b border-label-ink/30 pb-2 font-display text-lg font-semibold uppercase tracking-widest">
          {title}
        </div>
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function Boxes({ boxes, showPass, showFail }: { boxes: BoundingBox[]; showPass: boolean; showFail: boolean }) {
  return (
    <>
      {boxes.map((b) => {
        if (b.kind === "ok" && !showPass) return null;
        if (b.kind === "violation" && !showFail) return null;
        return (
          <div
            key={b.id}
            className={cn(
              "pointer-events-none absolute rounded-sm border-2",
              b.kind === "ok" ? "border-pass" : "border-fail",
            )}
            style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
          >
            <span
              className={cn(
                "absolute -top-3 left-0 max-w-none whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[9px] leading-tight",
                b.kind === "ok" ? "bg-pass text-primary-foreground" : "bg-fail text-destructive-foreground",
              )}
            >
              {b.text}
            </span>
          </div>
        );
      })}
    </>
  );
}

function Index() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [sample, setSample] = useState<PackInput | null>(null);
  const [checks, setChecks] = useState<ClauseCheck[] | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUpload, setIsUpload] = useState(false);
  const [tab, setTab] = useState<ImageTab>("front");
  const [showPass, setShowPass] = useState(true);
  const [showFail, setShowFail] = useState(true);
  const [camOpen, setCamOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveFn = useServerFn(saveInspection);
  const saveMutation = useMutation({
    mutationFn: (payload: {
      productName: string;
      brand: string;
      category: string;
      imageUrl?: string | undefined;
      status: string;
      violations: ClauseCheck[];
    }) =>
      saveFn({
        data: {
          productName: payload.productName,
          brand: payload.brand,
          category: payload.category,
          imageUrl: payload.imageUrl,
          status: payload.status,
          violations: payload.violations
            .filter((c) => c.status === "violation")
            .map((c) => ({
              clause: c.clause,
              title: c.title,
              severity: c.severity,
              extracted: c.extracted,
              remediation: c.remediation,
            })),
        },
      }),
    onSuccess: () => {
      toast.success(t("action.saved"));
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCamOpen(false);
  };

  const loadSample = (key: "atta" | "biscuit") => {
    const s = SAMPLES[key];
    stopCam();
    setSample(s.input);
    setChecks(analyze(s.input));
    setImageUrl(s.image);
    setIsUpload(false);
    setTab("front");
  };

  const loadCustom = (dataUrl: string) => {
    stopCam();
    const input = customPack();
    setSample(input);
    setChecks(analyze(input));
    setImageUrl(dataUrl);
    setIsUpload(true);
    setTab("front");
  };

  const reset = () => {
    stopCam();
    setSample(null);
    setChecks(null);
    setImageUrl(null);
    setIsUpload(false);
    setTab("front");
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        loadCustom(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCamOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      toast.error("Camera is not available in this environment.");
      setCamOpen(false);
    }
  };

  const snapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    loadCustom(canvas.toDataURL("image/jpeg", 0.8));
  };

  const boxes: BoundingBox[] = sample && sample.productKey !== "custom" && !isUpload ? SAMPLES[sample.productKey as "atta" | "biscuit"].boxes[tab] : [];
  const overall = checks ? deriveStatus(checks) : null;
  const violationCount = checks?.filter((c) => c.status === "violation").length ?? 0;
  const reviewCount = checks?.filter((c) => c.status === "review").length ?? 0;
  const passCount = checks?.filter((c) => c.status === "pass").length ?? 0;

  const exportPdf = () => {
    if (!sample || !checks || !overall) return;
    buildNoticePdf({
      productName: sample.productName,
      brand: sample.brand,
      category: sample.category,
      status: overall,
      officer: "Officer Devansh · Zone 1",
      violations: checks.filter((c) => c.status === "violation"),
    });
  };

  const mockLines = sample && sample.productKey !== "custom" ? SAMPLES[sample.productKey as "atta" | "biscuit"].mock[tab] : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Quick-test action bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {t("quick.title")}
        </span>
        <button
          type="button"
          onClick={() => loadSample("atta")}
          className="inline-flex items-center gap-2 rounded-md border border-pass/50 bg-pass-soft px-4 py-2 text-sm font-medium text-pass transition-colors hover:bg-pass-soft/70"
        >
          <CircleCheck className="h-4 w-4" />
          {t("quick.compliant")}
        </button>
        <button
          type="button"
          onClick={() => loadSample("biscuit")}
          className="inline-flex items-center gap-2 rounded-md border border-fail/50 bg-fail-soft px-4 py-2 text-sm font-medium text-fail transition-colors hover:bg-fail-soft/70"
        >
          <CircleX className="h-4 w-4" />
          {t("quick.noncompliant")}
        </button>
        {sample && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("quick.reset")}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left — evidence capture */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              {t("upload.title")}
            </h2>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  tab === tb.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t(tb.key)}
              </button>
            ))}
          </div>

          <div
            className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-secondary/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            {camOpen ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <button
                    type="button"
                    onClick={snapshot}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    <Camera className="h-4 w-4" />
                    {t("upload.snapshot")}
                  </button>
                  <button
                    type="button"
                    onClick={stopCam}
                    className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm text-foreground"
                  >
                    <X className="h-4 w-4" />
                    {t("upload.webcamStop")}
                  </button>
                </div>
              </>
            ) : (
              <>
                {isUpload && imageUrl ? (
                  <img src={imageUrl} alt="Captured pack" className="h-full w-full object-contain" />
                ) : sample && sample.productKey !== "custom" ? (
                  tab === "front" ? (
                    <img src={SAMPLES[sample.productKey as "atta" | "biscuit"].image} alt={sample.productName} className="h-full w-full object-contain" />
                  ) : (
                    <MockLabel title={sample.productName} lines={mockLines ?? []} />
                  )
                ) : sample ? (
                  <img src={imageUrl ?? ""} alt="Captured pack" className="h-full w-full object-contain" />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-full w-full flex-col items-center justify-center gap-3 text-center"
                  >
                    <ImagePlus className="h-10 w-10 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{t("upload.drop")}</span>
                    <span className="text-xs text-muted-foreground">{t("upload.formats")}</span>
                  </button>
                )}
                {boxes.length > 0 && <Boxes boxes={boxes} showPass={showPass} showFail={showFail} />}
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ImagePlus className="h-4 w-4" />
              {t("upload.browse")}
            </button>
            {camOpen ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4" />
                {t("upload.webcam")}
              </span>
            ) : (
              <button
                type="button"
                onClick={startCam}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Video className="h-4 w-4" />
                {t("upload.webcam")}
              </button>
            )}
          </div>

          {boxes.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("tags.title")}
              </div>
              <label className="mr-4 inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} className="accent-[var(--pass)]" />
                {t("tags.pass")}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={showFail} onChange={(e) => setShowFail(e.target.checked)} className="accent-[var(--fail)]" />
                {t("tags.violation")}
              </label>
            </div>
          )}
        </section>

        {/* Right — audit engine */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              {t("audit.title")}
            </h2>
          </div>

          {!checks || !sample || !overall ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("audit.idle")}
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4",
                  overall === "COMPLIANT"
                    ? "border-pass/50 bg-pass-soft"
                    : overall === "NON-COMPLIANT"
                      ? "border-fail/50 bg-fail-soft"
                      : "border-warn/50 bg-warn-soft",
                )}
              >
                <StatusBadge status={overall} size="lg" />
                <div className="flex gap-4 text-sm">
                  <span className="text-fail">
                    <strong className="font-display text-lg">{violationCount}</strong>{" "}
                    {t("audit.violations")}
                  </span>
                  <span className="text-pass">
                    <strong className="font-display text-lg">{passCount}</strong>{" "}
                    {t("audit.passed")}
                  </span>
                  <span className="text-warn">
                    <strong className="font-display text-lg">{reviewCount}</strong>{" "}
                    {t("audit.review")}
                  </span>
                </div>
              </div>

              <div className="mb-4 rounded-lg border border-border bg-background/40 p-3">
                <div className="font-display text-base font-semibold uppercase tracking-wide text-foreground">
                  {sample.productName}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {sample.brand} · {sample.category}
                </div>
              </div>

              <div className="mb-4 space-y-2">
                {checks.map((c) => (
                  <details key={c.clause} className="group rounded-lg border border-border bg-background/40">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                      <span className="font-mono text-[11px] text-muted-foreground">{c.clause}</span>
                      <span className="flex-1 text-sm font-medium text-foreground">{c.title}</span>
                      <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] font-semibold", chipStyles[c.status])}>
                        {chipLabels[c.status]}
                      </span>
                    </summary>
                    <div className="border-t border-border px-3 py-3 text-sm">
                      <p className="text-muted-foreground">{c.detail}</p>
                      {c.extracted && (
                        <p className="mt-2 break-words rounded bg-muted p-2 font-mono text-xs text-foreground">
                          <span className="text-muted-foreground">{t("audit.extracted")}: </span>
                          {c.extracted}
                        </p>
                      )}
                      {c.remediation && (
                        <p className="mt-2 text-xs text-warn">
                          <span className="font-semibold">{t("audit.remediation")}: </span>
                          {c.remediation}
                        </p>
                      )}
                    </div>
                  </details>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({
                      productName: sample.productName,
                      brand: sample.brand,
                      category: sample.category,
                      imageUrl: imageUrl ?? undefined,
                      status: overall,
                      violations: checks,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? t("action.saving") : t("action.save")}
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <FileDown className="h-4 w-4" />
                  {t("action.pdf")}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
