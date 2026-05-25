export const ROW_H = 'min-h-[56px]';

export const SAMPLE_DATA: Record<string, [string, string]> = {
  hash: ['#1', '#2'],
  nom: ['Dupont', 'Martin'],
  prenom: ['Jean', 'Marie'],
  email: ['j.dupont@mail.fr', 'm.martin@mail.fr'],
  telephone: ['06 12 34 56 78', '07 89 01 23 45'],
  date_ajout: ['12 jan 2026', '03 fev 2026'],
  statut: ['Nouveau', 'Contacte'],
  actions: ['...', '...'],
  acces: ['Actif', 'Inactif'],
  ia: ['On', 'Off'],
  vendeur: ['P. Durand', 'S. Leroy'],
  societe: ['ACME Corp', 'Tech SA'],
  secteur: ['SaaS', 'Conseil'],
  site: ['acme.com', 'tech.fr'],
  maps: ['Paris', 'Lyon'],
  role: ['Admin', 'Admin'],
  cree_le: ['15 mar 2026', '22 avr 2026'],
  manager_first_name: ['Pierre', 'Sophie'],
  manager_last_name: ['Durand', 'Leroy'],
};

export function getSampleValue(key: string, rowIdx: number, fieldType?: string): string {
  const pair = SAMPLE_DATA[key];
  if (pair) return pair[rowIdx] ?? pair[0];
  if (fieldType === 'url') return rowIdx === 0 ? 'https://lien.fr' : 'https://site.com';
  return rowIdx === 0 ? 'Valeur 1' : 'Valeur 2';
}
