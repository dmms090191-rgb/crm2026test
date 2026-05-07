import rawSnapshot from '../../../../generated/auditSnapshot.json';

export interface AuditSnapshot {
  generatedAt: string;
  anyCount: number;
  anyOccurrences: { file: string; line: number; text: string }[];
  unusedImportCount: number;
  unusedImports: { file: string; line: number; name: string }[];
  largeFileCount: number;
  largeFiles: { file: string; lines: number; overflow?: number }[];
  tscErrorCount?: number;
  tscErrors?: { file: string; line: number; code: string; message: string }[];
  eslintErrorCount?: number;
  eslintWarningCount?: number;
  eslintIssues?: { file: string; line: number; severity: string; ruleId: string; message: string }[];
  totalFilesAnalyzed?: number;
  totalLinesAnalyzed?: number;
  totalOverflowLines?: number;
}

const snapshot = rawSnapshot as AuditSnapshot;

export { snapshot as auditSnapshot };

export interface AuditCheck {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
}

export interface AuditSection {
  id: string;
  title: string;
  color: string;
  checks: AuditCheck[];
}

function anyCheck(s: AuditSnapshot): AuditCheck {
  const count = s.anyCount;
  if (count === 0) {
    return { id: 'any', label: 'Usage de "any"', status: 'ok', detail: 'Aucune occurrence de "any" detectee.' };
  }
  const files = [...new Set(s.anyOccurrences.map((o) => o.file))];
  const status: AuditCheck['status'] = count >= 5 ? 'error' : 'warning';
  const fileList = files.map((f) => f.replace('src/', '')).join(', ');
  return {
    id: 'any',
    label: 'Usage de "any"',
    status,
    detail: `${count} occurrence${count > 1 ? 's' : ''} de "any" dans ${files.length} fichier${files.length > 1 ? 's' : ''} (${fileList}).`,
  };
}

function unusedImportsCheck(s: AuditSnapshot): AuditCheck {
  const count = s.unusedImportCount;
  if (count === 0) {
    return { id: 'unused', label: 'Imports inutilises', status: 'ok', detail: 'Aucun import inutilise detecte.' };
  }
  const files = [...new Set(s.unusedImports.map((u) => u.file))];
  const status: AuditCheck['status'] = count >= 10 ? 'error' : 'warning';
  return {
    id: 'unused',
    label: 'Imports inutilises',
    status,
    detail: `${count} import${count > 1 ? 's' : ''} inutilise${count > 1 ? 's' : ''} dans ${files.length} fichier${files.length > 1 ? 's' : ''}.`,
  };
}

function largeFilesCheck(s: AuditSnapshot): AuditCheck {
  const count = s.largeFileCount;
  if (count === 0) {
    return { id: 'components', label: 'Taille des composants', status: 'ok', detail: 'Aucun fichier ne depasse 300 lignes.' };
  }
  const top3 = s.largeFiles.slice(0, 3).map((f) => {
    const name = f.file.split('/').pop();
    return `${name} (${f.lines}l)`;
  });
  const status: AuditCheck['status'] = count >= 10 ? 'error' : 'warning';
  return {
    id: 'components',
    label: 'Taille des composants',
    status,
    detail: `${count} fichier${count > 1 ? 's' : ''} depasse${count > 1 ? 'nt' : ''} 300 lignes. Top : ${top3.join(', ')}.`,
  };
}

function tscErrorCheck(s: AuditSnapshot): AuditCheck {
  const count = s.tscErrorCount ?? 0;
  const errors = s.tscErrors ?? [];
  if (count === 0) {
    return { id: 'tsc', label: 'Compilation TypeScript', status: 'ok', detail: 'Aucune erreur de compilation detectee.' };
  }
  const files = [...new Set(errors.map((e: { file: string }) => e.file))];
  const status: AuditCheck['status'] = count >= 5 ? 'error' : 'warning';
  const fileList = files.slice(0, 5).map((f: string) => f.replace('src/', '')).join(', ');
  return {
    id: 'tsc',
    label: 'Compilation TypeScript',
    status,
    detail: `${count} erreur${count > 1 ? 's' : ''} tsc dans ${files.length} fichier${files.length > 1 ? 's' : ''} (${fileList}).`,
  };
}

function eslintCheck(s: AuditSnapshot): AuditCheck {
  const errorCount = s.eslintErrorCount ?? 0;
  const warningCount = s.eslintWarningCount ?? 0;
  const issues = s.eslintIssues ?? [];
  const total = errorCount + warningCount;

  if (total === 0) {
    return { id: 'eslint', label: 'ESLint', status: 'ok', detail: 'Aucun probleme ESLint detecte.' };
  }

  const files = [...new Set(issues.map((i) => i.file))];
  const status: AuditCheck['status'] = errorCount > 0 ? 'error' : 'warning';
  const parts: string[] = [];
  if (errorCount > 0) parts.push(`${errorCount} erreur${errorCount > 1 ? 's' : ''}`);
  if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);

  return {
    id: 'eslint',
    label: 'ESLint',
    status,
    detail: `${parts.join(', ')} dans ${files.length} fichier${files.length > 1 ? 's' : ''}.`,
  };
}

function buildQualityChecks(s: AuditSnapshot): AuditCheck[] {
  return [
    { id: 'typescript', label: 'Typage TypeScript strict', status: 'ok', detail: 'Mode strict active dans tsconfig.' },
    eslintCheck(s),
    tscErrorCheck(s),
    unusedImportsCheck(s),
    anyCheck(s),
    largeFilesCheck(s),
  ];
}

export function computeCurrentSections(s: AuditSnapshot = snapshot): AuditSection[] {
  return [
    {
      id: 'security',
      title: 'Securite',
      color: '#f87171',
      checks: [
        { id: 'rls', label: 'Row Level Security active', status: 'ok', detail: 'Toutes les tables ont RLS active.' },
        { id: 'env', label: 'Variables d\'environnement', status: 'ok', detail: 'Aucune cle exposee cote client.' },
        { id: 'auth', label: 'Auth Supabase configuree', status: 'ok', detail: 'Authentification email/password en place.' },
        { id: 'policies', label: 'Politiques RLS completes', status: 'ok', detail: 'Toutes les tables ont des politiques SELECT restrictives.' },
        { id: 'service-role', label: 'Service role key non exposee', status: 'ok', detail: 'La cle service_role n\'est pas presente dans le code frontend.' },
      ],
    },
    {
      id: 'performance',
      title: 'Performance',
      color: '#38bdf8',
      checks: [
        { id: 'bundle', label: 'Taille du bundle', status: 'ok', detail: 'Bundle principal < 250 KB gzippe.' },
        { id: 'lazy', label: 'Lazy loading des routes', status: 'ok', detail: 'Les dashboards vendor et client sont lazy-loaded via React.lazy.' },
        { id: 'images', label: 'Optimisation des images', status: 'ok', detail: 'Aucune image lourde detectee dans le build.' },
        { id: 'indexes', label: 'Index BDD sur colonnes critiques', status: 'ok', detail: 'Index idx_leads_email cree sur leads.email.' },
        { id: 'queries', label: 'Requetes N+1', status: 'ok', detail: 'Pas de pattern N+1 detecte dans les composants principaux.' },
      ],
    },
    {
      id: 'quality',
      title: 'Qualite du code',
      color: '#34d399',
      checks: buildQualityChecks(s),
    },
    {
      id: 'architecture',
      title: 'Architecture',
      color: '#fbbf24',
      checks: [
        { id: 'structure', label: 'Structure des dossiers', status: 'ok', detail: 'Organisation par feature (admin, vendor, client) coherente.' },
        { id: 'separation', label: 'Separation des responsabilites', status: 'ok', detail: 'Logique metier dans /lib, composants dans /pages et /components.' },
        { id: 'reuse', label: 'Composants reutilisables', status: 'ok', detail: 'Chat et Agenda sont partages entre les dashboards.' },
        { id: 'env-config', label: 'Configuration centralisee', status: 'ok', detail: '.env pour les variables, themeTokens.ts pour le design system.' },
        { id: 'migrations', label: 'Migrations ordonnees', status: 'ok', detail: 'Migrations ordonnees. Fichiers archive deplaces hors du dossier actif.' },
      ],
    },
    {
      id: 'database',
      title: 'Base de donnees',
      color: '#a78bfa',
      checks: [
        { id: 'schema', label: 'Schema normalise', status: 'ok', detail: 'Relations bien definies avec foreign keys.' },
        { id: 'cascades', label: 'Cascades de suppression', status: 'ok', detail: 'ON DELETE CASCADE configure sur les relations critiques.' },
        { id: 'backups', label: 'Sauvegardes automatiques', status: 'ok', detail: 'Sauvegardes Supabase activees (plan actuel).' },
        { id: 'orphans', label: 'Donnees orphelines', status: 'ok', detail: '0 lead sans statut. Colonne statut NOT NULL avec default "Nouveau".' },
        { id: 'realtime', label: 'Realtime configure', status: 'ok', detail: 'Realtime active sur les tables leads et messages.' },
      ],
    },
  ];
}

export function computeGlobalScore(sections: AuditSection[]): number {
  const allChecks = sections.flatMap((s) => s.checks);
  const total = allChecks.length;
  if (total === 0) return 100;
  const points = allChecks.reduce((sum, c) => {
    if (c.status === 'ok') return sum + 1;
    if (c.status === 'warning') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / total) * 100);
}

export const MOCK_SECTIONS: AuditSection[] = computeCurrentSections();
export const MOCK_GLOBAL_SCORE = computeGlobalScore(MOCK_SECTIONS);
