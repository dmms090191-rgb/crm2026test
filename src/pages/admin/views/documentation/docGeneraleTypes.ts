import type { ContextCard } from './ContextCardsView';

export interface TabSource {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface DocSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: string;
}

export interface IdeaItem {
  id: string;
  title: string;
  content: string;
  status: string;
}

export interface AmeliorationItem {
  id: string;
  title: string;
  description: string;
  status: string;
  category_id: string | null;
}

export interface AmeliorationCategoryItem {
  id: string;
  name: string;
  position: number;
}

export interface Props {
  tabs: TabSource[];
  contents: Record<string, string>;
  contextCards: ContextCard[];
  ideas: IdeaItem[];
  ameliorations: AmeliorationItem[];
  ameliorationCategories: AmeliorationCategoryItem[];
}

export interface SectionColors {
  accent: string;
  accentSoft: string;
  accentBorder: string;
  iconBg: string;
}

export const SECTION_COLORS: Record<string, SectionColors> = {
  'contexte-chatgpt': {
    accent: '#22d3ee',
    accentSoft: 'rgba(34,211,238,0.07)',
    accentBorder: 'rgba(34,211,238,0.15)',
    iconBg: 'rgba(34,211,238,0.10)',
  },
  'technologies': {
    accent: '#a78bfa',
    accentSoft: 'rgba(167,139,250,0.06)',
    accentBorder: 'rgba(167,139,250,0.14)',
    iconBg: 'rgba(167,139,250,0.10)',
  },
  'base-de-donnees': {
    accent: '#34d399',
    accentSoft: 'rgba(52,211,153,0.06)',
    accentBorder: 'rgba(52,211,153,0.14)',
    iconBg: 'rgba(52,211,153,0.10)',
  },
  'structure-crm': {
    accent: '#fb923c',
    accentSoft: 'rgba(251,146,60,0.06)',
    accentBorder: 'rgba(251,146,60,0.14)',
    iconBg: 'rgba(251,146,60,0.10)',
  },
  'idees': {
    accent: '#fbbf24',
    accentSoft: 'rgba(251,191,36,0.06)',
    accentBorder: 'rgba(251,191,36,0.14)',
    iconBg: 'rgba(251,191,36,0.10)',
  },
  'ameliorations': {
    accent: '#f472b6',
    accentSoft: 'rgba(244,114,182,0.06)',
    accentBorder: 'rgba(244,114,182,0.14)',
    iconBg: 'rgba(244,114,182,0.10)',
  },
  'audit-technique': {
    accent: '#2dd4bf',
    accentSoft: 'rgba(45,212,191,0.06)',
    accentBorder: 'rgba(45,212,191,0.14)',
    iconBg: 'rgba(45,212,191,0.10)',
  },
};

export const DEFAULT_SECTION_COLOR: SectionColors = {
  accent: '#94a3b8',
  accentSoft: 'rgba(148,163,184,0.06)',
  accentBorder: 'rgba(148,163,184,0.14)',
  iconBg: 'rgba(148,163,184,0.10)',
};

export const DOC_GROUP_COLOR: SectionColors = {
  accent: '#22d3ee',
  accentSoft: 'rgba(34,211,238,0.07)',
  accentBorder: 'rgba(34,211,238,0.15)',
  iconBg: 'rgba(34,211,238,0.10)',
};

export function getSectionColor(sectionId: string): SectionColors {
  return SECTION_COLORS[sectionId] ?? DEFAULT_SECTION_COLOR;
}
