-- Etape 0.4 : fermeture de public.upsert_panel_hidden_tabs(text, uuid, uuid, jsonb).
-- Meme signature, meme type de retour (void), meme logique d'upsert. Pas de DROP
-- (CREATE OR REPLACE conserve proprietaire et ACL, puis REVOKE/GRANT explicites).
-- SECURITY INVOKER : la RLS de panel_hidden_tabs (INSERT/UPDATE/DELETE = app_metadata.role
-- super_admin) s'applique EN PLUS de la garde.
-- Compatible avec la prod deployee : aucun appel de cette RPC dans le code ; le frontend
-- ecrit directement la table sous RLS (src/hooks/usePanelHiddenTabs.ts). Policies et grants
-- de table inchanges.

CREATE OR REPLACE FUNCTION public.upsert_panel_hidden_tabs(
  p_panel_role     text,
  p_company_id     uuid,
  p_target_user_id uuid,
  p_hidden_tabs    jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_existing_id uuid;
BEGIN
  -- Masquer / reafficher : reserve a Talvex Administrateur (meme regle que les policies
  -- INSERT/UPDATE/DELETE de panel_hidden_tabs). En Visu, le JWT reste super_admin.
  -- app_metadata uniquement : user_metadata est modifiable par l'utilisateur.
  IF coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'super_admin' THEN
    RAISE EXCEPTION 'upsert_panel_hidden_tabs : reserve a Talvex Administrateur'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.panel_hidden_tabs
  WHERE panel_role = p_panel_role
    AND company_id IS NOT DISTINCT FROM p_company_id
    AND target_user_id IS NOT DISTINCT FROM p_target_user_id;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.panel_hidden_tabs
       SET hidden_tabs = p_hidden_tabs,
           updated_at  = pg_catalog.now()
     WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.panel_hidden_tabs (panel_role, company_id, target_user_id, hidden_tabs, updated_at)
    VALUES (p_panel_role, p_company_id, p_target_user_id, p_hidden_tabs, pg_catalog.now());
  END IF;
END;
$function$;

-- PUBLIC porte un EXECUTE implicite et anon un EXECUTE explicite : retirer les deux.
REVOKE ALL ON FUNCTION public.upsert_panel_hidden_tabs(text, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_panel_hidden_tabs(text, uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_panel_hidden_tabs(text, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_panel_hidden_tabs(text, uuid, uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.upsert_panel_hidden_tabs(text, uuid, uuid, jsonb) IS
  'Upsert du masquage d''onglets/cartes par panel. SECURITY INVOKER : RLS de panel_hidden_tabs appliquee + garde app_metadata.role = super_admin. EXECUTE retire a anon et PUBLIC (etape 0.4).';
