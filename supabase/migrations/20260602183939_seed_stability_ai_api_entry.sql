/*
  # Seed Stability AI API entry

  1. New Data
    - Inserts a new row in `sa_ai_apis` for "Stability AI"
    - URL points to the Stability AI credits page
    - Function describes its purpose (IA Premium image / outpainting / extension Zone 4)
    - API key is stored as a Supabase Secret (STABILITY_API_KEY)
    - Status defaults to active

  2. Important Notes
    - Uses ON CONFLICT to avoid duplicates if re-run
    - Does not modify existing DeepSeek or Recraft rows
*/

INSERT INTO sa_ai_apis (name, url, remaining_credit, saas_function, status, notes, cost, purchase_date)
VALUES (
  'Stability AI',
  'https://platform.stability.ai/account/credits',
  NULL,
  'IA Premium image / outpainting / extension d''image Zone 4',
  'active',
  'Cle API configuree via Supabase Secrets (STABILITY_API_KEY). Ne jamais stocker la cle ici.',
  NULL,
  NULL
)
ON CONFLICT DO NOTHING;
