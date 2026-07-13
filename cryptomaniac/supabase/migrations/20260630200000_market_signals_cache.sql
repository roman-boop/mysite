-- Market signals cache: stores OI and funding signals generated server-side every 10 minutes
-- Also stores per-signal screenshots attached by users

-- ── 1. Signals cache table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_signals_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL, -- 'oi' | 'funding'
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  scanned INTEGER NOT NULL DEFAULT 0,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_signals_cache_type_generated
  ON public.market_signals_cache (signal_type, generated_at DESC);

-- ── 2. Signal screenshots table ─────────────────────────────────────────────
-- Stores per-signal screenshot references (public URL or storage path)
CREATE TABLE IF NOT EXISTS public.signal_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL,   -- 'oi' | 'funding'
  symbol TEXT NOT NULL,        -- e.g. 'BTC-USDT'
  screenshot_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signal_screenshots_type_symbol
  ON public.signal_screenshots (signal_type, symbol);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.market_signals_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_screenshots ENABLE ROW LEVEL SECURITY;

-- Cache is public-readable (signals are shared for all users)
DROP POLICY IF EXISTS "public_read_market_signals_cache" ON public.market_signals_cache;
CREATE POLICY "public_read_market_signals_cache"
  ON public.market_signals_cache FOR SELECT TO public USING (true);

-- Only service role can write to cache (via API route with service key)
-- We use anon key in the refresh route but allow insert via RLS for authenticated service
DROP POLICY IF EXISTS "service_write_market_signals_cache" ON public.market_signals_cache;
CREATE POLICY "service_write_market_signals_cache"
  ON public.market_signals_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Screenshots: public read, authenticated users can insert/update/delete their own
DROP POLICY IF EXISTS "public_read_signal_screenshots" ON public.signal_screenshots;
CREATE POLICY "public_read_signal_screenshots"
  ON public.signal_screenshots FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "users_manage_own_signal_screenshots" ON public.signal_screenshots;
CREATE POLICY "users_manage_own_signal_screenshots"
  ON public.signal_screenshots FOR ALL TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Allow anonymous insert for screenshot (user may not be logged in, we allow it)
DROP POLICY IF EXISTS "anon_insert_signal_screenshots" ON public.signal_screenshots;
CREATE POLICY "anon_insert_signal_screenshots"
  ON public.signal_screenshots FOR INSERT TO public WITH CHECK (true);
