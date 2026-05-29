/*
  # Create dedicated Talvex company for Super Admin

  1. New Data
    - Insert a new company row for "Talvex" with a fixed UUID for the Super Admin
    - This ensures the Super Admin has its own isolated company space for logos

  2. User Metadata Update
    - Set company_id on the Super Admin user (contact@talvex.fr) so the RLS
      policies scope their data correctly

  3. Important Notes
    - The admin company "David Schemmama" (a0000000-...-000000000001) remains unchanged
    - This separation ensures Super Admin logos and Admin logos are fully isolated
    - The Super Admin's company_id is now b0000000-0000-0000-0000-000000000001
*/

-- 1. Create the Talvex SA company
INSERT INTO public.companies (id, name)
VALUES ('b0000000-0000-0000-0000-000000000001', 'Talvex')
ON CONFLICT (id) DO NOTHING;

-- 2. Assign company_id to the super_admin user
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"company_id": "b0000000-0000-0000-0000-000000000001"}'::jsonb
WHERE raw_app_meta_data->>'role' = 'super_admin'
  AND (raw_app_meta_data->>'company_id' IS NULL OR raw_app_meta_data->>'company_id' = '');
