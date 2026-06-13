/*
  # Add modal_kind to sa_visual_presets

  Adds a column to distinguish presets between modals A/B/C/D.
  Element type alone cannot separate Modal B (text icon) from Modal C (text simple).

  1. Changes
    - Add `modal_kind` text column to `sa_visual_presets` (nullable for backfill safety)
    - Backfill existing rows: card -> 'D', button -> 'A', text -> 'C'
    - Add composite index for (user_id, modal_kind)

  2. Security
    - No RLS changes (existing policies remain)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sa_visual_presets' AND column_name = 'modal_kind'
  ) THEN
    ALTER TABLE sa_visual_presets ADD COLUMN modal_kind text;
  END IF;
END $$;

UPDATE sa_visual_presets
SET modal_kind = CASE
  WHEN element_type = 'card' THEN 'D'
  WHEN element_type = 'button' THEN 'A'
  ELSE 'C'
END
WHERE modal_kind IS NULL;

CREATE INDEX IF NOT EXISTS sa_visual_presets_user_modal_kind_idx
  ON sa_visual_presets (user_id, modal_kind);
