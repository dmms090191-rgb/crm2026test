
CREATE TABLE client_body_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL DEFAULT auth.uid(),

  weight numeric(6,2),
  bmi numeric(5,2),
  body_fat_percent numeric(5,2),
  water_percent numeric(5,2),
  muscle numeric(6,2),
  morphology text,
  bone_mass numeric(5,2),
  body_age integer,
  visceral_fat numeric(5,2),
  protein_mass numeric(5,2),
  global_body_score numeric(5,2),

  chest_measure numeric(6,2),
  waist_measure numeric(6,2),
  belly_measure numeric(6,2),
  hips_measure numeric(6,2),
  thigh_measure numeric(6,2),
  arm_measure numeric(6,2),

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cba_client ON client_body_assessments(client_id);
CREATE INDEX idx_cba_company ON client_body_assessments(company_id);

ALTER TABLE client_body_assessments ENABLE ROW LEVEL SECURITY;

-- Client sees own assessments (matched via email -> leads)
CREATE POLICY "select_own_assessments" ON client_body_assessments FOR SELECT
  TO authenticated
  USING (
    client_id IN (SELECT l.id FROM leads l WHERE l.email = auth.jwt()->>'email' AND l.actif = true)
    OR (auth.jwt()->'app_metadata'->>'role' = 'super_admin')
    OR (
      auth.jwt()->'app_metadata'->>'role' IN ('admin', 'company_super_admin')
      AND company_id = (auth.jwt()->'app_metadata'->>'company_id')::uuid
    )
  );

CREATE POLICY "insert_assessments" ON client_body_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (SELECT l.id FROM leads l WHERE l.email = auth.jwt()->>'email' AND l.actif = true)
    OR (auth.jwt()->'app_metadata'->>'role' = 'super_admin')
    OR (
      auth.jwt()->'app_metadata'->>'role' IN ('admin', 'company_super_admin')
      AND company_id = (auth.jwt()->'app_metadata'->>'company_id')::uuid
    )
  );

CREATE POLICY "update_assessments" ON client_body_assessments FOR UPDATE
  TO authenticated
  USING (
    client_id IN (SELECT l.id FROM leads l WHERE l.email = auth.jwt()->>'email' AND l.actif = true)
    OR (auth.jwt()->'app_metadata'->>'role' = 'super_admin')
    OR (
      auth.jwt()->'app_metadata'->>'role' IN ('admin', 'company_super_admin')
      AND company_id = (auth.jwt()->'app_metadata'->>'company_id')::uuid
    )
  )
  WITH CHECK (
    client_id IN (SELECT l.id FROM leads l WHERE l.email = auth.jwt()->>'email' AND l.actif = true)
    OR (auth.jwt()->'app_metadata'->>'role' = 'super_admin')
    OR (
      auth.jwt()->'app_metadata'->>'role' IN ('admin', 'company_super_admin')
      AND company_id = (auth.jwt()->'app_metadata'->>'company_id')::uuid
    )
  );

CREATE POLICY "delete_assessments" ON client_body_assessments FOR DELETE
  TO authenticated
  USING (
    client_id IN (SELECT l.id FROM leads l WHERE l.email = auth.jwt()->>'email' AND l.actif = true)
    OR (auth.jwt()->'app_metadata'->>'role' = 'super_admin')
    OR (
      auth.jwt()->'app_metadata'->>'role' IN ('admin', 'company_super_admin')
      AND company_id = (auth.jwt()->'app_metadata'->>'company_id')::uuid
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_cba_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cba_updated_at
  BEFORE UPDATE ON client_body_assessments
  FOR EACH ROW EXECUTE FUNCTION update_cba_updated_at();
