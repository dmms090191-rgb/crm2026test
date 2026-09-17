-- Etape 0.6-B : verrouillage final de la lecture anonyme des sites publics.
-- Appliquee APRES le deploiement Vercel du commit 9a5a00f (colonnes explicites cote front,
-- src/lib/publicSiteColumns.ts), verifie en production : plus aucun select=* anonyme.
-- Miroir exact de PUBLIC_HOME_PAGE_COLUMNS et PUBLIC_TEMPLATE_COLUMNS.
-- Plus aucun prix, domain_notes/status/provider/type/order/expires, draft_*, published_* non lus,
-- ni config/owner des templates pour anon. Les colonnes utilisees par les policies anon
-- (company_id, is_active, is_published, id, custom_domain, domain_verified, slug, site_scope,
-- active_template_id) restent accordees. Authenticated et service_role inchanges.
-- Aucun DROP, aucune donnee modifiee.
-- ROLLBACK : grant select on table public.company_home_pages, public.site_templates to anon;

revoke select on table public.company_home_pages from anon;
grant select (id, company_id, site_scope, slug, custom_domain, domain_verified, is_active, is_published,
  active_template_id, title, subtitle, welcome_message, logo_url, main_color, secondary_color,
  hero_image_url, app_icon_url)
  on table public.company_home_pages to anon;

revoke select on table public.site_templates from anon;
grant select (id, template_key) on table public.site_templates to anon;

notify pgrst, 'reload schema';
