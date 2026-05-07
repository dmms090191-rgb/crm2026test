import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { getThemeTokens } from '../../../../lib/themeTokens';
import type { AuditCheck } from './auditMockData';

export function statusIcon(status: AuditCheck['status'], size = 'w-4 h-4') {
  switch (status) {
    case 'ok':
      return <CheckCircle className={size} />;
    case 'warning':
      return <AlertTriangle className={size} />;
    case 'error':
      return <XCircle className={size} />;
  }
}

export function statusColor(status: AuditCheck['status'], tokens: ReturnType<typeof getThemeTokens>) {
  switch (status) {
    case 'ok':
      return { text: tokens.success.text, bg: tokens.success.bg, border: tokens.success.border };
    case 'warning':
      return { text: tokens.warning.text, bg: tokens.warning.bg, border: tokens.warning.border };
    case 'error':
      return { text: tokens.danger.text, bg: tokens.danger.bg, border: tokens.danger.border };
  }
}

export function sectionScore(checks: AuditCheck[]) {
  const total = checks.length;
  if (total === 0) return 100;
  const points = checks.reduce((sum, c) => {
    if (c.status === 'ok') return sum + 1;
    if (c.status === 'warning') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / total) * 100);
}

export function scoreColor(score: number) {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}
