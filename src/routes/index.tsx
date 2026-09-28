import { createFileRoute } from "@tanstack/react-router";
import { Index } from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SatyaMaap 360 — Weights & Measures Verification & Stamping (Sec 24)" },
      {
        name: "description",
        content:
          "Online Verification and Lifecycle Management System for Weighing and Measuring Instruments under Section 24 of the Legal Metrology Act, 2009.",
      },
      { property: "og:title", content: "SatyaMaap 360 — Weights & Measures Verification & Stamping" },
      {
        property: "og:description",
        content:
          "Statutory testing, MPE calculation, digital verification certificates, and lifecycle tracking for commercial weighing instruments.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});
