/*
  # Enable realtime on company_logos

  1. Changes
    - Add `company_logos` table to the `supabase_realtime` publication
    - This allows the sidebar active-logo hook to receive live updates when a logo is selected, deleted, or modified

  2. Important Notes
    - Uses IF NOT EXISTS pattern via DO block to avoid errors if already added
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'company_logos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_logos;
  END IF;
END $$;
