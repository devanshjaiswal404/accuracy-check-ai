import { createFileRoute } from "@tanstack/react-router";
import { Index } from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MetrologyCheck AI — Legal Metrology & NPPA Enforcement" },
      {
        name: "description",
        content:
          "Legal Metrology (LMPC Rules 2011) and NPPA DPCO 2013 inspection, e-commerce surveillance & Form V enforcement platform.",
      },
      { property: "og:title", content: "MetrologyCheck AI — Legal Metrology & NPPA Enforcement" },
      {
        property: "og:description",
        content: "Statutory pack-label audits, DPCO pricing compliance, e-commerce surveillance and Form V seizure memorandums.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});
