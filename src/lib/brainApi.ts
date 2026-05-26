import { supabase } from './supabase';
import type { AiCompanyBrain, AiScope } from './brainTypes';
import { defaultBrain } from './brainTypes';

export async function fetchBrain(companyId: string): Promise<AiCompanyBrain | null> {
  console.log('[brainApi] fetchBrain companyId:', companyId);
  const { data, error } = await supabase
    .from('ai_company_brain')
    .select('*')
    .eq('company_id', companyId)
    .eq('ai_scope', 'company')
    .maybeSingle();
  if (error) console.error('[brainApi] fetchBrain error:', error.message, error);
  console.log('[brainApi] fetchBrain result:', data ? `id=${data.id}` : 'null');
  return data;
}

export async function fetchPlatformBrain(): Promise<AiCompanyBrain | null> {
  console.log('[brainApi] fetchPlatformBrain');
  const { data, error } = await supabase
    .from('ai_company_brain')
    .select('*')
    .is('company_id', null)
    .eq('ai_scope', 'platform')
    .maybeSingle();
  if (error) console.error('[brainApi] fetchPlatformBrain error:', error.message, error);
  console.log('[brainApi] fetchPlatformBrain result:', data ? `id=${data.id}` : 'null');
  return data;
}

export interface UpsertResult {
  data: AiCompanyBrain | null;
  error: string | null;
}

export async function upsertBrain(
  companyId: string | null,
  fields: Partial<Omit<AiCompanyBrain, 'id' | 'created_at' | 'updated_at'>>,
  scope: AiScope = 'company'
): Promise<UpsertResult> {
  const { company_id: _cid, ai_scope: _scope, ...safeFields } = fields as Record<string, unknown>;
  console.log('[brainApi] upsertBrain start | scope:', scope, '| companyId:', companyId);

  if (scope === 'platform') {
    const existing = await fetchPlatformBrain();
    if (existing) {
      console.log('[brainApi] platform UPDATE id:', existing.id);
      const { data, error } = await supabase
        .from('ai_company_brain')
        .update({ ...safeFields, ai_scope: 'platform', company_id: null, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      if (error) {
        console.error('[brainApi] platform update error:', error.message, error);
        return { data: null, error: error.message };
      }
      console.log('[brainApi] platform UPDATE success:', data?.id);
      return { data, error: null };
    }
    console.log('[brainApi] platform INSERT (new)');
    const defaults = defaultBrain(null, 'platform');
    const { data, error } = await supabase
      .from('ai_company_brain')
      .insert({ ...defaults, ...safeFields, ai_scope: 'platform', company_id: null })
      .select()
      .maybeSingle();
    if (error) {
      console.error('[brainApi] platform insert error:', error.message, error);
      return { data: null, error: error.message };
    }
    console.log('[brainApi] platform INSERT success:', data?.id);
    return { data, error: null };
  }

  if (!companyId) {
    console.error('[brainApi] upsertBrain: companyId is null for company scope');
    return { data: null, error: 'company_id manquant' };
  }

  const existing = await fetchBrain(companyId);
  if (existing) {
    console.log('[brainApi] company UPDATE id:', existing.id, '| companyId:', companyId);
    const { data, error } = await supabase
      .from('ai_company_brain')
      .update({ ...safeFields, company_id: companyId, ai_scope: 'company', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .maybeSingle();
    if (error) {
      console.error('[brainApi] company update error:', error.message, error);
      return { data: null, error: error.message };
    }
    console.log('[brainApi] company UPDATE success:', data?.id);
    return { data, error: null };
  }

  console.log('[brainApi] company INSERT (new) | companyId:', companyId);
  const defaults = defaultBrain(companyId, 'company');
  const { data, error } = await supabase
    .from('ai_company_brain')
    .insert({ ...defaults, ...safeFields, company_id: companyId, ai_scope: 'company' })
    .select()
    .maybeSingle();
  if (error) {
    console.error('[brainApi] company insert error:', error.message, error);
    return { data: null, error: error.message };
  }
  console.log('[brainApi] company INSERT success:', data?.id);
  return { data, error: null };
}

export async function fetchCompanies(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');
  return data ?? [];
}
