/*
  # Backfill structured columns from JSONB data

  ## Summary
  This is a one-time backfill migration that extracts structured fields (prenom, nom,
  email, telephone) from the existing `data` JSONB column into the new dedicated columns.

  ## What it does
  - For each existing lead where the new columns are NULL, attempts to extract values
    from common key variants in the `data` JSONB field.
  - Email keys tried: 'Email', 'email', 'E-mail', 'e-mail', 'mail', 'Mail'
  - Phone keys tried: 'Telephone', 'telephone', 'Tel', 'tel', 'Phone', 'phone'
  - First name keys tried: 'Prenom', 'prenom', 'Prénom', 'prénom', 'Firstname', 'firstname'
  - Last name keys tried: 'Nom', 'nom', 'Name', 'name', 'Lastname', 'lastname'

  ## Safety
  - Only updates rows where the target column is still NULL (idempotent)
  - Email is normalized to lowercase, trimmed
  - Telephone is stored as extracted (no E.164 conversion in SQL — done in frontend)
  - data JSONB column is NOT modified
  - This migration is safe to re-run
*/

UPDATE leads
SET email = lower(trim(
  COALESCE(
    NULLIF(data->>'Email', ''),
    NULLIF(data->>'email', ''),
    NULLIF(data->>'E-mail', ''),
    NULLIF(data->>'e-mail', ''),
    NULLIF(data->>'mail', ''),
    NULLIF(data->>'Mail', '')
  )
))
WHERE email IS NULL
  AND (
    data->>'Email' IS NOT NULL OR
    data->>'email' IS NOT NULL OR
    data->>'E-mail' IS NOT NULL OR
    data->>'mail' IS NOT NULL
  );

UPDATE leads
SET telephone = trim(
  COALESCE(
    NULLIF(data->>'Telephone', ''),
    NULLIF(data->>'telephone', ''),
    NULLIF(data->>'Tel', ''),
    NULLIF(data->>'tel', ''),
    NULLIF(data->>'Phone', ''),
    NULLIF(data->>'phone', '')
  )
)
WHERE telephone IS NULL
  AND (
    data->>'Telephone' IS NOT NULL OR
    data->>'telephone' IS NOT NULL OR
    data->>'Tel' IS NOT NULL OR
    data->>'Phone' IS NOT NULL
  );

UPDATE leads
SET prenom = initcap(trim(
  COALESCE(
    NULLIF(data->>'Prenom', ''),
    NULLIF(data->>'prenom', ''),
    NULLIF(data->>'Prénom', ''),
    NULLIF(data->>'prénom', ''),
    NULLIF(data->>'Firstname', ''),
    NULLIF(data->>'firstname', '')
  )
))
WHERE prenom IS NULL
  AND (
    data->>'Prenom' IS NOT NULL OR
    data->>'prenom' IS NOT NULL OR
    data->>'Prénom' IS NOT NULL OR
    data->>'Firstname' IS NOT NULL
  );

UPDATE leads
SET nom = initcap(trim(
  COALESCE(
    NULLIF(data->>'Nom', ''),
    NULLIF(data->>'nom', ''),
    NULLIF(data->>'Name', ''),
    NULLIF(data->>'name', ''),
    NULLIF(data->>'Lastname', ''),
    NULLIF(data->>'lastname', '')
  )
))
WHERE nom IS NULL
  AND (
    data->>'Nom' IS NOT NULL OR
    data->>'nom' IS NOT NULL OR
    data->>'Name' IS NOT NULL OR
    data->>'Lastname' IS NOT NULL
  );
