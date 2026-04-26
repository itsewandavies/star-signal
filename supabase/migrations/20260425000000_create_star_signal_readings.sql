-- Star Signal: initial schema
-- Creates the readings table used by the Whop webhook + reading delivery system

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.star_signal_readings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT NOT NULL,
    whop_order_id       TEXT,
    first_name          TEXT,
    birth_date          DATE,
    birth_time          TEXT,
    birth_city          TEXT,
    gender              TEXT,
    life_area           TEXT,
    relationship_status TEXT,
    cosmic_signs        TEXT[],
    life_path_number    INTEGER,
    sun_sign            TEXT,
    personal_year_2026  INTEGER,
    generation_status   TEXT NOT NULL DEFAULT 'generating',
    reading_content     JSONB,
    oto_unlocked        BOOLEAN NOT NULL DEFAULT FALSE,
    oto_unlocked_at     TIMESTAMPTZ,
    accessed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ss_readings_email_idx  ON public.star_signal_readings (email);
CREATE INDEX IF NOT EXISTS ss_readings_status_idx ON public.star_signal_readings (generation_status);

-- RLS disabled — service role key only, no public access needed
ALTER TABLE public.star_signal_readings DISABLE ROW LEVEL SECURITY;
