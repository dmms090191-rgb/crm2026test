/*
  # Add image blend config to editor sessions

  1. Modified Tables
    - `editor_sessions`
      - `image_blend_config` (jsonb, nullable) - Stores the blend configuration for background image edge blending.
        Contains: enabled, mode (simple/intelligent), fadeIntensity, fadeSize, edgeBlur, smartBlend data.

  2. Notes
    - Column is nullable; null means blend is disabled (default state)
    - When enabled, stores the full ImageBlendConfig object as JSON
    - Used by the "Fusion avec le fond" feature in the editor's Image tab
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'image_blend_config'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN image_blend_config jsonb DEFAULT NULL;
  END IF;
END $$;
