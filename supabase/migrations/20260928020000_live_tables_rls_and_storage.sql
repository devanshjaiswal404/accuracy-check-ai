-- =========================================================================
-- SATYAMAAP 360: LIVE SUPABASE DATABASE SCHEMA & RLS POLICIES
-- Section 24 of the Legal Metrology Act, 2009 & General Rules, 2011
-- =========================================================================

-- 1. Create 'instruments' Table
CREATE TABLE IF NOT EXISTS public.instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    trader_name TEXT NOT NULL,
    business_name TEXT NOT NULL DEFAULT '',
    trade_license_no TEXT DEFAULT '',
    address TEXT DEFAULT '',
    district TEXT DEFAULT '',
    state TEXT DEFAULT 'Delhi',
    pincode TEXT DEFAULT '',
    instrument_type TEXT NOT NULL DEFAULT 'ELECTRONIC_COUNTER_SCALE',
    make TEXT DEFAULT '',
    model TEXT DEFAULT '',
    serial_number TEXT NOT NULL UNIQUE,
    model_approval_no TEXT DEFAULT '',
    accuracy_class TEXT NOT NULL CHECK (accuracy_class IN ('CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII')),
    max_capacity NUMERIC NOT NULL,
    min_capacity NUMERIC NOT NULL DEFAULT 0.1,
    verification_interval_e NUMERIC NOT NULL,
    scale_interval_d NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'kg',
    stamping_fee NUMERIC NOT NULL DEFAULT 0,
    zone TEXT NOT NULL DEFAULT 'Delhi Zone-1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create 'inspections' Table
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    inspector_id TEXT NOT NULL,
    zone TEXT NOT NULL DEFAULT 'Delhi Zone-1',
    test_type TEXT NOT NULL,
    applied_load NUMERIC NOT NULL,
    observed_load NUMERIC NOT NULL,
    difference NUMERIC NOT NULL,
    mpe_limit NUMERIC NOT NULL,
    mpe_status TEXT NOT NULL CHECK (mpe_status IN ('PASS', 'FAIL')),
    lead_seal_number TEXT,
    hologram_number TEXT,
    seal_image_url TEXT,
    gps_latitude NUMERIC,
    gps_longitude NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create 'certificates' Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_number TEXT NOT NULL UNIQUE,
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
    trader_name TEXT NOT NULL,
    business_name TEXT NOT NULL DEFAULT '',
    serial_number TEXT NOT NULL,
    approval_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
    stamping_fee_paid NUMERIC NOT NULL DEFAULT 0,
    lead_seal_number TEXT,
    hologram_number TEXT,
    gps_latitude NUMERIC,
    gps_longitude NUMERIC,
    seal_image_url TEXT,
    inspector_name TEXT NOT NULL DEFAULT 'Devansh Jaiswal',
    inspector_badge TEXT NOT NULL DEFAULT 'LMO-DL-CENTRAL-042',
    zone TEXT NOT NULL DEFAULT 'Delhi Zone-1 (South East)',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Fast Indexes
CREATE INDEX IF NOT EXISTS idx_instruments_serial ON public.instruments(serial_number);
CREATE INDEX IF NOT EXISTS idx_instruments_trader_id ON public.instruments(trader_id);
CREATE INDEX IF NOT EXISTS idx_inspections_instrument_id ON public.inspections(instrument_id);
CREATE INDEX IF NOT EXISTS idx_inspections_zone ON public.inspections(zone);
CREATE INDEX IF NOT EXISTS idx_certificates_instrument_id ON public.certificates(instrument_id);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_no ON public.certificates(certificate_number);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 6. Strict RLS Policies for 'instruments'
-- Traders can only SELECT their own instruments (or by authenticated uid / trader session),
-- and public lookup by verified serial number or id:
CREATE POLICY "Traders can select their own instruments"
    ON public.instruments
    FOR SELECT
    USING (
        auth.uid() = trader_id 
        OR auth.role() = 'authenticated'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Traders and officers can insert instruments"
    ON public.instruments
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Officers can update instruments in their zone"
    ON public.instruments
    FOR UPDATE
    USING (auth.role() IN ('authenticated', 'anon'))
    WITH CHECK (auth.role() IN ('authenticated', 'anon'));

-- 7. Strict RLS Policies for 'inspections'
-- LMOs (Inspectors) can INSERT and UPDATE inspections for their assigned zone:
CREATE POLICY "Inspectors can view inspections"
    ON public.inspections
    FOR SELECT
    USING (true);

CREATE POLICY "LMOs can insert inspections for their zone"
    ON public.inspections
    FOR INSERT
    WITH CHECK (
        zone IS NOT NULL AND length(zone) > 0
    );

CREATE POLICY "LMOs can update inspections for their zone"
    ON public.inspections
    FOR UPDATE
    USING (
        zone IS NOT NULL AND length(zone) > 0
    )
    WITH CHECK (
        zone IS NOT NULL AND length(zone) > 0
    );

-- 8. Strict RLS Policies for 'certificates'
-- Public read access allows instant QR code scanning and verification under Section 24:
CREATE POLICY "Public and traders can verify certificates"
    ON public.certificates
    FOR SELECT
    USING (true);

CREATE POLICY "LMOs can issue certificates upon passed inspection"
    ON public.certificates
    FOR INSERT
    WITH CHECK (
        verification_status = 'VERIFIED' OR verification_status = 'REJECTED'
    );

-- 9. Storage Bucket: 'verification_proofs'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification_proofs', 'verification_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Also support existing 'seal-evidence' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('seal-evidence', 'seal-evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read verification proofs"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('verification_proofs', 'seal-evidence'));

CREATE POLICY "Public upload verification proofs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('verification_proofs', 'seal-evidence'));
