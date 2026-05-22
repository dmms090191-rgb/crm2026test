export interface Argumentaire {
  id: string;
  title: string;
  content: string;
  position: number;
  created_at: string;
}

export interface SAStatut {
  id: string;
  nom: string;
  couleur: string;
}

const FALLBACK_COLOR = '#6b7280';

export function getStatutColor(statut: string, saStatuts: SAStatut[]) {
  const s = saStatuts.find(ps => ps.nom === statut);
  const couleur = s?.couleur ?? FALLBACK_COLOR;
  return {
    color: couleur,
    bg: `${couleur}14`,
    border: `${couleur}38`,
    dot: couleur,
  };
}

export function checkboxStyle(checked: boolean, borderColor: string): React.CSSProperties {
  return {
    width: 16, height: 16, borderRadius: 4,
    border: `2px solid ${checked ? '#0ea5e9' : borderColor}`,
    background: checked ? '#0ea5e9' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 150ms', flexShrink: 0,
  };
}
