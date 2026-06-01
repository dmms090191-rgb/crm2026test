import type { ThemeStatus } from '../../../../hooks/useThemeConfig';

export const STATUS_META: Record<ThemeStatus, { label: string; color: string; bg: string; border: string }> = {
  visible:  { label: 'Visible',       color: '#34d399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)' },
  hidden:   { label: 'Masque',        color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)' },
  rework:   { label: 'A retravailler', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)' },
  premium:  { label: 'Premium',       color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)' },
};
