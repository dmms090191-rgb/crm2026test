-- Etape 0.6-A : lecture anonyme des sites publics, partie COMPATIBLE avec le frontend deploye.
-- Aucune lecture anonyme de companies ni de company_logos dans src ; site_sections est lue en anon
-- avec une liste explicite de colonnes (src/pages/public/CompanySitePage.tsx).
-- company_home_pages et site_templates gardent leurs colonnes pour l'instant (le frontend deploye
-- fait select('*') en anon) : leur restriction par colonnes (0.6-B) exige d'abord un deploiement Vercel.
-- Aucun DROP (les policies anon sont conservees), aucune donnee modifiee.

-- 1. companies : anon ne lit plus que id et name (plus de noms d'admin, tier, parent, etc.)
revoke select on table public.companies from anon;
grant select (id, name) on table public.companies to anon;

-- 2. company_logos : aucune colonne pour anon (aucun lecteur anonyme ; la policy anon reste en place, inerte)
revoke select on table public.company_logos from anon;

-- 3. site_sections : contenu publie seulement (draft_content, draft_styles, dates exclues)
revoke select on table public.site_sections from anon;
grant select (home_page_id, section_key, "position", is_visible, published_content, published_styles)
  on table public.site_sections to anon;

-- 4. company_home_pages : la policy 'template' ne sert qu'a la landing platform (getLandingTemplateKey).
--    Effet : une page societe sans slug et au domaine non verifie n'est plus lisible en anon.
alter policy "Anon can view active template pages" on public.company_home_pages
  using ((is_active = true) and (active_template_id is not null) and (site_scope = 'platform'::text));

-- 5. Defense en profondeur : aucune ecriture anon sur ces tables (TRUNCATE echappe a la RLS)
revoke insert, update, delete, truncate, references, trigger
  on table public.companies, public.company_home_pages, public.company_logos, public.site_sections, public.site_templates
  from anon;

notify pgrst, 'reload schema';
