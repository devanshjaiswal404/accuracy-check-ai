-- Supabase Migration: SatyaMaap 360 Instruments & Field Inspections under Section 24
-- Legal Metrology Act, 2009

-- 1. Create 'instruments' Table
CREATE TABLE IF NOT EXISTS public.instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_name TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    accuracy_class TEXT NOT NULL CHECK (accuracy_class IN ('CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII')),
    max_capacity NUMERIC NOT NULL,
    verification_interval_e NUMERIC NOT NULL,
    stamping_fee NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create 'inspections' Table
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    inspector_id TEXT NOT NULL,
    test_type TEXT NOT NULL,
    applied_load NUMERIC NOT NULL,
    observed_load NUMERIC NOT NULL,
    mpe_status TEXT NOT NULL CHECK (mpe_status IN ('PASS', 'FAIL')),
    lead_seal_number TEXT,
    hologram_number TEXT,
    seal_image_url TEXT,
    gps_latitude NUMERIC,
    gps_longitude NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_instruments_serial ON public.instruments(serial_number);
CREATE INDEX IF NOT EXISTS idx_inspections_instrument_id ON public.inspections(instrument_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Allow public read access to instruments"
    ON public.instruments
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert to instruments"
    ON public.instruments
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public read access to inspections"
    ON public.inspections
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert to inspections"
    ON public.inspections
    FOR INSERT
    WITH CHECK (true);

-- 6. Storage Bucket for Anti-Fraud Seal Photographs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('seal-evidence', 'seal-evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access to seal evidence"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'seal-evidence');

CREATE POLICY "Allow public upload to seal evidence"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'seal-evidence');
