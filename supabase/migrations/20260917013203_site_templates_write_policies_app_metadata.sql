-- Etape 0.3 : les ecritures sur site_templates ne lisent plus user_metadata
-- (modifiable par l'utilisateur via auth.updateUser) mais app_metadata.role.
-- ATTENTION : app_metadata.role reste attribuable par les edge functions create-user
-- et update-user-password tant que leurs correctifs (etape 0.2) ne sont pas deployes.
-- Forme ALTER POLICY : echoue si une policy n'existe pas, conserve TO authenticated /
-- PERMISSIVE, aucune fenetre sans policy, aucun DROP.
-- Les policies SELECT (anon et authenticated) ne sont volontairement PAS modifiees.

ALTER POLICY "Super admin can insert templates" ON public.site_templates
  WITH CHECK ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin' );

ALTER POLICY "Super admin can update templates" ON public.site_templates
  USING      ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin' )
  WITH CHECK ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin' );

ALTER POLICY "Super admin can delete templates" ON public.site_templates
  USING ( ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin' );
