/*
  # Seed Recraft API entry and update DeepSeek cost

  1. Data Changes
    - Inserts a Recraft row into `sa_ai_apis` if none exists
    - API key is NOT stored — only a note indicating it is configured via Supabase Secrets
    - Updates DeepSeek row with cost = '20 $' if cost is currently NULL

  2. Important Notes
    - The real RECRAFT_API_KEY is managed via Supabase Secrets, never stored in DB
    - Recraft cost is 20 $ (initial API pack purchase)
    - This is idempotent; safe to re-run
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
  notes,
  cost,
  purchase_date
)
SELECT
  'Recraft',
  'https://www.recraft.ai/profile/api',
  NULL,
  NULL,
  NULL,
  NULL,
  'Generation de logos IA',
  'active',
  'Cle API configuree via Supabase Secrets (RECRAFT_API_KEY). Ne pas stocker la cle ici.',
  '20 $',
  '28/05/2026'
WHERE NOT EXISTS (
  SELECT 1 FROM sa_ai_apis WHERE name = 'Recraft'
);

UPDATE sa_ai_apis
SET cost = '20 $'
WHERE name = 'DeepSeek' AND cost IS NULL;
