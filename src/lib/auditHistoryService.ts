import { supabase } from './supabase';
import type { AuditSection } from '../pages/admin/views/documentation/auditMockData';

export interface AuditHistoryRow {
  id: string;
  global_score: number;
  total_checks: number;
  ok_count: number;
  warning_count: number;
  error_count: number;
  section_scores: Record<string, { score: number; ok: number; warn: number; err: number }>;
  created_at: string;
}

function sectionScore(checks: AuditSection['checks']): number {
  const total = checks.length;
  if (total === 0) return 100;
  const points = checks.reduce((sum, c) => {
    if (c.status === 'ok') return sum + 1;
    if (c.status === 'warning') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / total) * 100);
}

export async function saveAuditRun(
  sections: AuditSection[],
  globalScore: number,
): Promise<{ error: string | null }> {
  const allChecks = sections.flatMap((s) => s.checks);
  const totalChecks = allChecks.length;
  const okCount = allChecks.filter((c) => c.status === 'ok').length;
  const warningCount = allChecks.filter((c) => c.status === 'warning').length;
  const errorCount = allChecks.filter((c) => c.status === 'error').length;

  const sectionScores: Record<string, { score: number; ok: number; warn: number; err: number }> = {};
  for (const s of sections) {
    sectionScores[s.id] = {
      score: sectionScore(s.checks),
      ok: s.checks.filter((c) => c.status === 'ok').length,
      warn: s.checks.filter((c) => c.status === 'warning').length,
      err: s.checks.filter((c) => c.status === 'error').length,
    };
  }

  const { error } = await supabase.from('audit_history').insert({
    global_score: globalScore,
    total_checks: totalChecks,
    ok_count: okCount,
    warning_count: warningCount,
    error_count: errorCount,
    section_scores: sectionScores,
  });

  return { error: error?.message ?? null };
}

export async function fetchAuditHistory(limit = 10): Promise<{
  data: AuditHistoryRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('audit_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: (data as AuditHistoryRow[] | null) ?? [],
    error: error?.message ?? null,
  };
}
