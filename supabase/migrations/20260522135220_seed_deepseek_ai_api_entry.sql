/*
  # Seed DeepSeek API entry

  1. Data Changes
    - Inserts a default DeepSeek row into `sa_ai_apis` if none exists yet
    - API key is NOT stored — only a masked placeholder indicating it is configured via Supabase Secrets
    - All other fields are editable by the Super Admin

  2. Important Notes
    - The real DEEPSEEK_API_KEY secret is untouched
    - This is a one-time seed; the ON CONFLICT clause prevents duplicates on re-run
*/

INSERT INTO sa_ai_apis (
  name,
  url,
  account_email,
  account_password,
  api_key,
  remaining_credit,
  saas_function,
  status,
  notes
)
SELECT
  'DeepSeek',
  'https://platform.deepseek.com',
  NULL,
  NULL,
  NULL,
  '20 $',
  'Reponse automatique IA dans le chat client',
  'active',
  'Cle API configuree via Supabase Secrets (DEEPSEEK_API_KEY). Ne pas stocker la cle ici.'
WHERE NOT EXISTS (
  SELECT 1 FROM sa_ai_apis WHERE name = 'DeepSeek'
);
