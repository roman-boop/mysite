-- Journal entry screenshots table
CREATE TABLE IF NOT EXISTS public.journal_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  screenshot_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_screenshots_entry_id ON public.journal_screenshots(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_screenshots_user_id ON public.journal_screenshots(user_id);

ALTER TABLE public.journal_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_journal_screenshots" ON public.journal_screenshots;
CREATE POLICY "users_manage_own_journal_screenshots"
ON public.journal_screenshots
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
