CREATE OR REPLACE FUNCTION public.get_company_admin_ids(p_company_id uuid)
RETURNS TABLE(auth_user_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id
  FROM auth.users
  WHERE raw_app_meta_data->>'role' = 'admin'
    AND raw_app_meta_data->>'company_id' = p_company_id::text;
$$;