/*
  # Theme isole par societe

  1. Modifications
    - Ajout colonne `theme_config jsonb` sur `companies`
      Structure: { theme, glass_config, custom_theme_key, custom_theme_overrides }
      Stocke le theme propre a chaque societe, partage entre Admin/Vendor/Client de la societe

  2. Securite
    - Nouvelle policy UPDATE pour permettre a un Admin de modifier UNIQUEMENT sa propre societe
    - SA conserve son acces complet (policy existante)
    - Vendor/Client peuvent lire (policies existantes) mais pas modifier
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'theme_config'
  ) THEN
    ALTER TABLE companies ADD COLUMN theme_config jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='companies' AND policyname='Admin can update own company'
  ) THEN
    CREATE POLICY "Admin can update own company"
      ON companies FOR UPDATE
      TO authenticated
      USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
        AND id = (((auth.jwt() -> 'app_metadata'::text) ->> 'company_id'::text))::uuid)
      WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
        AND id = (((auth.jwt() -> 'app_metadata'::text) ->> 'company_id'::text))::uuid);
  END IF;
END $$;
