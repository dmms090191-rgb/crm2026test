import { supabase } from './supabase';

/*
 * Templates attribues a une entreprise (table site_template_assignments).
 * Une attribution = droit d'utiliser le template. Aucun partage de donnees ni de CRM.
 * La RLS ne renvoie que les attributions des entreprises dont l'acteur gere le site.
 */
export async function getAssignedTemplateIds(companyId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('site_template_assignments')
    .select('template_id')
    .eq('company_id', companyId);
  if (error) throw error;
  return new Set((data ?? []).map((row: { template_id: string }) => row.template_id));
}
