-- =========================================================================
-- SATYAMAAP 360: COMPLETE DATABASE MIGRATION
-- Project: ybbbvtyurbdcwhzubwyk
-- Section 24 of the Legal Metrology Act, 2009
-- =========================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. Core Table: 'instruments'
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_name TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    accuracy_class TEXT NOT NULL,
    max_capacity NUMERIC NOT NULL,
    verification_interval_e NUMERIC NOT NULL,
    stamping_fee NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Extended statutory & business metadata (optional)
    business_name TEXT,
    trade_license_no TEXT,
    address TEXT,
    district TEXT,
    state TEXT,
    pincode TEXT,
    instrument_type TEXT,
    make TEXT,
    model TEXT,
    model_approval_no TEXT,
    min_capacity NUMERIC,
    scale_interval_d NUMERIC,
    unit TEXT DEFAULT 'kg'
);

-- -------------------------------------------------------------------------
-- 2. Core Table: 'inspections'
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    inspector_id TEXT NOT NULL,
    test_type TEXT NOT NULL,
    applied_load NUMERIC NOT NULL,
    observed_load NUMERIC NOT NULL,
    mpe_status TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Extended calibration & physical sealing metadata (optional)
    difference NUMERIC,
    mpe_limit NUMERIC,
    lead_seal_number TEXT,
    hologram_number TEXT,
    seal_image_url TEXT,
    gps_latitude NUMERIC,
    gps_longitude NUMERIC,
    zone TEXT
);

-- -------------------------------------------------------------------------
-- 3. Core Table: 'certificates'
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    qr_hash TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Extended certificate metadata (optional)
    certificate_number TEXT,
    trader_name TEXT,
    business_name TEXT,
    serial_number TEXT,
    approval_date DATE,
    verification_status TEXT DEFAULT 'VERIFIED',
    stamping_fee_paid NUMERIC,
    lead_seal_number TEXT,
    hologram_number TEXT,
    gps_latitude NUMERIC,
    gps_longitude NUMERIC,
    seal_image_url TEXT,
    inspector_name TEXT,
    inspector_badge TEXT,
    zone TEXT
);

-- -------------------------------------------------------------------------
-- 4. Fast Indexes for High Performance Querying
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_instruments_serial_number ON public.instruments(serial_number);
CREATE INDEX IF NOT EXISTS idx_inspections_instrument_id ON public.inspections(instrument_id);
CREATE INDEX IF NOT EXISTS idx_certificates_instrument_id ON public.certificates(instrument_id);
CREATE INDEX IF NOT EXISTS idx_certificates_qr_hash ON public.certificates(qr_hash);

-- -------------------------------------------------------------------------
-- 5. Enable Row Level Security (RLS)
-- -------------------------------------------------------------------------
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 6. RLS Policies: Allow Authenticated and Public Access for Verification
-- -------------------------------------------------------------------------

-- Instruments Policies
DROP POLICY IF EXISTS "Allow select instruments" ON public.instruments;
CREATE POLICY "Allow select instruments"
    ON public.instruments
    FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow insert instruments" ON public.instruments;
CREATE POLICY "Allow insert instruments"
    ON public.instruments
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update instruments" ON public.instruments;
CREATE POLICY "Allow update instruments"
    ON public.instruments
    FOR UPDATE
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Inspections Policies
DROP POLICY IF EXISTS "Allow select inspections" ON public.inspections;
CREATE POLICY "Allow select inspections"
    ON public.inspections
    FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow insert inspections" ON public.inspections;
CREATE POLICY "Allow insert inspections"
    ON public.inspections
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Certificates Policies
DROP POLICY IF EXISTS "Allow select certificates" ON public.certificates;
CREATE POLICY "Allow select certificates"
    ON public.certificates
    FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow insert certificates" ON public.certificates;
CREATE POLICY "Allow insert certificates"
    ON public.certificates
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 7. Supabase Storage: Public Bucket 'verification_proofs'
-- -------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification_proofs', 'verification_proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Allow public read verification proofs" ON storage.objects;
CREATE POLICY "Allow public read verification proofs"
    ON storage.objects FOR SELECT
    TO authenticated, anon
    USING (bucket_id = 'verification_proofs');

DROP POLICY IF EXISTS "Allow public upload verification proofs" ON storage.objects;
CREATE POLICY "Allow public upload verification proofs"
    ON storage.objects FOR INSERT
    TO authenticated, anon
    WITH CHECK (bucket_id = 'verification_proofs');
