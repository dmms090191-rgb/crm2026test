import { MOCK_SECTIONS, type AuditCheck, type AuditSection } from './auditMockData';

export interface TriageItem {
  check: AuditCheck;
  sectionId: string;
  sectionTitle: string;
  sectionColor: string;
}

export interface TriageBucket {
  key: 'error' | 'warning' | 'ok';
  label: string;
  items: TriageItem[];
}

function flattenChecks(sections: AuditSection[]): TriageItem[] {
  return sections.flatMap((s) =>
    s.checks.map((c) => ({ check: c, sectionId: s.id, sectionTitle: s.title, sectionColor: s.color }))
  );
}

export function buildTriageBuckets(sections?: AuditSection[]): TriageBucket[] {
  const all = flattenChecks(sections ?? MOCK_SECTIONS);
  return [
    {
      key: 'error',
      label: 'A corriger maintenant',
      items: all.filter((i) => i.check.status === 'error'),
    },
    {
      key: 'warning',
      label: 'A surveiller',
      items: all.filter((i) => i.check.status === 'warning'),
    },
    {
      key: 'ok',
      label: 'Stable / ne pas toucher',
      items: all.filter((i) => i.check.status === 'ok'),
    },
  ];
}
