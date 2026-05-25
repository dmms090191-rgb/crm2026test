import { supabase } from '../../../../lib/supabase';
import type { AiCompanyBrain } from './brainTypes';
import { defaultBrain } from './brainTypes';

export async function fetchBrain(companyId: string): Promise<AiCompanyBrain | null> {
  const { data } = await supabase
    .from('ai_company_brain')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();
  return data;
}

export async function upsertBrain(
  companyId: string,
  fields: Partial<Omit<AiCompanyBrain, 'id' | 'created_at' | 'updated_at'>>
): Promise<AiCompanyBrain | null> {
  const existing = await fetchBrain(companyId);
  if (existing) {
    const { data } = await supabase
      .from('ai_company_brain')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .select()
      .maybeSingle();
    return data;
  }
  const defaults = defaultBrain(companyId);
  const { data } = await supabase
    .from('ai_company_brain')
    .insert({ ...defaults, ...fields })
    .select()
    .maybeSingle();
  return data;
}

export async function fetchCompanies(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');
  return data ?? [];
}
