/*
  # Isolation du theme par role (Super Admin vs Admin vs Vendor vs Client)

  1. Modifications
    - Ajout colonne `theme_by_role` (jsonb) sur `user_preferences`
      Structure: { "super_admin": { theme, custom_theme_key, custom_theme_overrides, glass_config }, "admin": {...}, ... }
      Permet au meme user_id de conserver un theme distinct par panel

  2. Securite
    - RLS existantes inchangees (toujours filtre par auth.uid() = user_id)
    - Aucune nouvelle policy necessaire

  3. Compatibilite
    - Colonnes existantes `theme`, `glass_config`, `custom_theme_key`, `custom_theme_overrides` conservees
    - Le code lit `theme_by_role[role]` en priorite puis tombe sur les colonnes legacy
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'theme_by_role'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN theme_by_role jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
