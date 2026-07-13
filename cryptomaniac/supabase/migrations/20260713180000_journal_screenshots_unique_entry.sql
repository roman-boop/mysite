-- Add unique constraint on entry_id in journal_screenshots
-- Required for upsert onConflict: 'entry_id' to work (PostgREST needs a unique index)
ALTER TABLE public.journal_screenshots
ADD CONSTRAINT journal_screenshots_entry_id_key UNIQUE (entry_id);
