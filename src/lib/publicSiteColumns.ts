/*
 * Lectures publiques (visiteur non connecte, role anon).
 * Miroir exact des GRANT SELECT (colonnes) TO anon de la migration 0.6-B (etape 0).
 * Ajouter une colonne ici sans l'accorder a anon en base fait echouer
 * la requete publique (permission denied). Jamais de select('*') en anonyme.
 */
export const PUBLIC_HOME_PAGE_COLUMNS = 'id, company_id, site_scope, slug, custom_domain, domain_verified, is_active, is_published, active_template_id, title, subtitle, welcome_message, logo_url, main_color, secondary_color, hero_image_url, app_icon_url';

export const PUBLIC_TEMPLATE_COLUMNS = 'id, template_key';
