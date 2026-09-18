import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function getPublicClient() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const ViolationInput = z.object({
  clause: z.string(),
  title: z.string(),
  severity: z.string().optional(),
  extracted: z.string().optional(),
  remediation: z.string().optional(),
});

const SaveInput = z.object({
  productName: z.string().min(1),
  brand: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.string().optional(),
  violations: z.array(ViolationInput).default([]),
});

export const saveInspection = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: product, error } = await supabase
      .from("inspected_products")
      .insert({
        product_name: data.productName,
        brand_name: data.brand ?? null,
        category: data.category ?? "General",
        image_url: data.imageUrl ?? null,
        status: data.status ?? "REVIEW",
        total_violations: data.violations.length,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.violations.length > 0) {
      const { error: vErr } = await supabase.from("detected_violations").insert(
        data.violations.map((v) => ({
          product_id: product.id,
          rule_clause: v.clause,
          violation_title: v.title,
          severity: v.severity ?? null,
          extracted_text: v.extracted ?? null,
          remediation: v.remediation ?? null,
        })),
      );
      if (vErr) throw new Error(vErr.message);
    }
    return { id: product.id };
  });

export const listInspections = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from("inspected_products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data;
});

export const getInspection = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: product, error } = await supabase
      .from("inspected_products")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!product) return null;
    const { data: violations, error: vErr } = await supabase
      .from("detected_violations")
      .select("*")
      .eq("product_id", product.id);
    if (vErr) throw new Error(vErr.message);
    return { product, violations: violations ?? [] };
  });
