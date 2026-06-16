-- Returns true if the given company_id belongs to the Willness (Barbara Wellness) network.
-- Checks if the company IS the Willness root or if its parent_company_id points to it.
CREATE OR REPLACE FUNCTION public.is_wellness_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = p_company_id
      AND (
        c.id = 'a88da833-932f-4fd7-9e89-1b7f72ad5362'::uuid
        OR c.parent_company_id = 'a88da833-932f-4fd7-9e89-1b7f72ad5362'::uuid
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_wellness_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_wellness_company(uuid) TO anon;
