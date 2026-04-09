-- Add position_type column to journal_entries
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS position_type TEXT NOT NULL DEFAULT '';
