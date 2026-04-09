-- Journal Module: trading_models and journal_entries tables

-- 1. Create trading_models table
CREATE TABLE IF NOT EXISTS public.trading_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    risk_management TEXT,
    stop_loss_targets TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create journal_entries table
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    asset TEXT NOT NULL DEFAULT '',
    direction TEXT NOT NULL DEFAULT 'long',
    timeframe TEXT NOT NULL DEFAULT '',
    trading_model_id UUID REFERENCES public.trading_models(id) ON DELETE SET NULL,
    trade_time TIMESTAMPTZ,
    risk_reward TEXT NOT NULL DEFAULT '',
    result TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_trading_models_user_id ON public.trading_models(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_trading_model_id ON public.journal_entries(trading_model_id);

-- 4. Enable RLS
ALTER TABLE public.trading_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for trading_models
DROP POLICY IF EXISTS "users_manage_own_trading_models" ON public.trading_models;
CREATE POLICY "users_manage_own_trading_models"
ON public.trading_models
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. RLS Policies for journal_entries
DROP POLICY IF EXISTS "users_manage_own_journal_entries" ON public.journal_entries;
CREATE POLICY "users_manage_own_journal_entries"
ON public.journal_entries
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
