import type { MobileCardStyle } from './mobileColumnTypes';

export type TableContext = 'sa_liste_admins' | 'admin_crm' | 'vendor_leads' | 'sa_crm_societe' | 'default';

export interface SampleRow {
  [key: string]: string;
}

export const AVATAR_KEYS = new Set([
  'nom', 'prenom', 'name', 'first_name', 'last_name',
  'manager_first_name', 'manager_last_name', 'societe',
]);

export const CONTACT_KEYS = new Set(['email', 'telephone', 'phone']);

export function getTableContext(tableKey: string): TableContext {
  if (tableKey.includes('sa_liste_admins') || tableKey.includes('sa_admins')) return 'sa_liste_admins';
  if (tableKey.includes('admin_crm')) return 'admin_crm';
  if (tableKey.includes('vendor_leads')) return 'vendor_leads';
  if (tableKey.includes('sa_crm_societe') || tableKey.includes('crm_societe')) return 'sa_crm_societe';
  return 'default';
}

export function getSampleRows(ctx: TableContext): [SampleRow, SampleRow] {
  switch (ctx) {
    case 'sa_liste_admins':
      return [
        { prenom: 'David', nom: 'Schemmama', email: 'd.schemmama@talvex.com', telephone: '06 12 34 56 78', societe: 'Talvex SAS', role: 'Admin', cree_le: '15 mar 2026', acces: 'on', actions: '1' },
        { prenom: 'Haim', nom: 'Balouka', email: 'h.balouka@exemple.fr', telephone: '07 98 76 54 32', societe: 'BLK Digital', role: 'Admin', cree_le: '22 avr 2026', acces: 'on', actions: '1' },
      ];
    case 'admin_crm':
      return [
        { nom: 'Dupont', prenom: 'Jean', email: 'j.dupont@mail.fr', telephone: '06 12 34 56 78', statut: 'Nouveau', acces: 'on', ia: 'on', vendeur: 'P. Durand', date_ajout: '12 jan 2026', hash: '#1', actions: '1' },
        { nom: 'Martin', prenom: 'Sophie', email: 's.martin@email.com', telephone: '07 65 43 21 09', statut: 'Contacte', acces: 'on', ia: 'off', vendeur: 'M. Leroy', date_ajout: '08 fev 2026', hash: '#2', actions: '1' },
      ];
    case 'vendor_leads':
      return [
        { nom: 'Dupont', prenom: 'Jean', email: 'j.dupont@mail.fr', telephone: '06 12 34 56 78', statut: 'Nouveau', acces: 'on', date_ajout: '12 jan 2026', hash: '#1', actions: '1' },
        { nom: 'Bernard', prenom: 'Marie', email: 'm.bernard@mail.com', telephone: '06 55 44 33 22', statut: 'Interesse', acces: 'off', date_ajout: '03 mar 2026', hash: '#2', actions: '1' },
      ];
    case 'sa_crm_societe':
      return [
        { nom: 'Confiance Travaux', prenom: '', societe: 'Confiance Travaux', manager_first_name: 'Pierre', manager_last_name: 'Durand', secteur: 'BTP', site: 'confiance-travaux.fr', maps: 'Paris 11e', telephone: '01 42 33 44 55', statut: 'Nouveau', actions: '1' },
        { nom: 'Bassard Toiture', prenom: '', societe: 'Bassard Toiture Zinguerie', manager_first_name: 'Marc', manager_last_name: 'Bassard', secteur: 'Couverture', site: 'bassard-toiture.com', maps: 'Lyon 3e', telephone: '04 78 22 11 33', statut: 'Contacte', actions: '1' },
      ];
    default:
      return [
        { nom: 'Dupont', prenom: 'Jean', email: 'j.dupont@mail.fr', telephone: '06 12 34 56 78', statut: 'Nouveau', acces: 'on', actions: '1' },
        { nom: 'Martin', prenom: 'Sophie', email: 's.martin@email.com', telephone: '07 65 43 21 09', statut: 'Contacte', acces: 'on', actions: '1' },
      ];
  }
}

export function getAvatarGradient(ctx: TableContext, idx: number): string {
  if (ctx === 'sa_liste_admins') return 'linear-gradient(135deg, #f59e0b, #d97706)';
  if (ctx === 'sa_crm_societe') return 'linear-gradient(135deg, #0ea5e9, #0284c7)';
  const grads = [
    'linear-gradient(135deg, #0ea5e9, #0284c7)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f43f5e, #e11d48)',
  ];
  return grads[idx % grads.length];
}

export const STYLE_SPACING: Record<MobileCardStyle, { cardPy: string; gapY: string; textSize: string; labelSize: string }> = {
  compact: { cardPy: 'py-2.5', gapY: 'space-y-0.5', textSize: 'text-[9px]', labelSize: 'text-[8px]' },
  comfort: { cardPy: 'py-3.5', gapY: 'space-y-1.5', textSize: 'text-[10px]', labelSize: 'text-[9px]' },
  detailed: { cardPy: 'py-4', gapY: 'space-y-2', textSize: 'text-[10px]', labelSize: 'text-[9px]' },
};
