import { MOCK_SECTIONS, MOCK_GLOBAL_SCORE, type AuditCheck } from './documentation/auditMockData';
import snapshot from '../../../generated/auditSnapshot.json';

export interface RecommendedAction {
  id: string;
  label: string;
  severity: 'error' | 'warning';
}

export const MOCK_OVERVIEW_SCORE = MOCK_GLOBAL_SCORE;

export const MOCK_LAST_ANALYSIS_DATE = snapshot.generatedAt;

function buildTopActions(): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const allChecks = MOCK_SECTIONS.flatMap((s) => s.checks);
  for (const c of allChecks) {
    if (c.status === 'error') {
      actions.push({ id: c.id, label: c.detail, severity: 'error' });
    }
  }
  for (const c of allChecks) {
    if (c.status === 'warning') {
      actions.push({ id: c.id, label: c.detail, severity: 'warning' });
    }
  }
  return actions.slice(0, 3);
}

export const MOCK_TOP_ACTIONS: RecommendedAction[] = buildTopActions();

function sectionScore(checks: AuditCheck[]) {
  const total = checks.length;
  if (total === 0) return 100;
  const points = checks.reduce((sum, c) => {
    if (c.status === 'ok') return sum + 1;
    if (c.status === 'warning') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / total) * 100);
}

export const MOCK_SECTION_SCORES = MOCK_SECTIONS.map((s) => ({
  label: s.title,
  score: sectionScore(s.checks),
}));
