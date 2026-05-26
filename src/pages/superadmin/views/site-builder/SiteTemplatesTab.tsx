import { useState } from 'react';
import {
  Eye, Check, LayoutGrid, Loader2, Sparkles, ArrowRight,
  Leaf, Flame, Dumbbell, Building2, HardHat, Zap,
} from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { SiteTemplate } from '../../../../lib/companyHomePages';
import type { SiteTab } from './SiteTabs';

interface Props {
  templates: SiteTemplate[];
  activeTemplateId: string | null;
  onPreview: (template: SiteTemplate) => void;
  onApply: (template: SiteTemplate) => Promise<void>;
  onTabChange: (tab: SiteTab) => void;
}

export default function SiteTemplatesTab({ templates, activeTemplateId, onPreview, onApply, onTabChange }: Props) {
  const t = useThemeTokens();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleApply = async (template: SiteTemplate) => {
    setApplyingId(template.id);
    try {
      await onApply(template);
    } finally {
      setApplyingId(null);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.borderLight}` }}
        >
          <LayoutGrid className="w-6 h-6" style={{ color: t.text.tertiary }} />
        </div>
        <p className="text-sm font-medium" style={{ color: t.text.secondary }}>Aucun template disponible</p>
        <p className="text-xs mt-1" style={{ color: t.text.tertiary }}>Les templates seront ajoutes prochainement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <Sparkles className="w-4 h-4" style={{ color: '#0ea5e9' }} />
        <div>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Bibliotheque de templates</h3>
          <p className="text-[10px] mt-0.5" style={{ color: t.text.tertiary }}>{templates.length} templates professionnels disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map(tmpl => {
          const isActive = tmpl.id === activeTemplateId;
          const isApplying = applyingId === tmpl.id;

          return (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              isActive={isActive}
              isApplying={isApplying}
              onPreview={() => { onPreview(tmpl); onTabChange('apercu'); }}
              onApply={() => handleApply(tmpl)}
              t={t}
            />
          );
        })}
      </div>
    </div>
  );
}

const TEMPLATE_THEME: Record<string, {
  gradient: string;
  accent: string;
  accentLight: string;
  accentBorder: string;
  icon: React.ReactNode;
  glow: string;
  orb1: string;
  orb2: string;
  mockupLines: string[];
}> = {
  talvex_official: {
    gradient: 'linear-gradient(145deg, #0c1929 0%, #0f2847 40%, #0a1628 100%)',
    accent: '#0ea5e9',
    accentLight: 'rgba(14,165,233,0.12)',
    accentBorder: 'rgba(14,165,233,0.25)',
    icon: <Zap className="w-5 h-5" />,
    glow: 'radial-gradient(ellipse at 30% 50%, rgba(14,165,233,0.2) 0%, transparent 60%)',
    orb1: 'rgba(14,165,233,0.15)',
    orb2: 'rgba(6,182,212,0.1)',
    mockupLines: ['CRM intelligent', 'Gestion complete', 'IA integree'],
  },
  renewable_energy: {
    gradient: 'linear-gradient(145deg, #052e16 0%, #064e3b 40%, #022c22 100%)',
    accent: '#10b981',
    accentLight: 'rgba(16,185,129,0.12)',
    accentBorder: 'rgba(16,185,129,0.25)',
    icon: <Leaf className="w-5 h-5" />,
    glow: 'radial-gradient(ellipse at 30% 50%, rgba(16,185,129,0.2) 0%, transparent 60%)',
    orb1: 'rgba(16,185,129,0.15)',
    orb2: 'rgba(234,179,8,0.08)',
    mockupLines: ['Devis solaire', 'Simulateur', 'Espace client'],
  },
  heat_pump: {
    gradient: 'linear-gradient(145deg, #1c1106 0%, #451a03 40%, #1c1106 100%)',
    accent: '#f97316',
    accentLight: 'rgba(249,115,22,0.12)',
    accentBorder: 'rgba(249,115,22,0.25)',
    icon: <Flame className="w-5 h-5" />,
    glow: 'radial-gradient(ellipse at 30% 50%, rgba(249,115,22,0.2) 0%, transparent 60%)',
    orb1: 'rgba(249,115,22,0.15)',
    orb2: 'rgba(14,165,233,0.08)',
    mockupLines: ['Installation PAC', 'Visites techniques', 'Rendez-vous'],
  },
  fitness: {
    gradient: 'linear-gradient(145deg, #1a0505 0%, #450a0a 40%, #1a0505 100%)',
    accent: '#ef4444',
    accentLight: 'rgba(239,68,68,0.12)',
    accentBorder: 'rgba(239,68,68,0.25)',
    icon: <Dumbbell className="w-5 h-5" />,
    glow: 'radial-gradient(ellipse at 30% 50%, rgba(239,68,68,0.2) 0%, transparent 60%)',
    orb1: 'rgba(239,68,68,0.15)',
    orb2: 'rgba(249,115,22,0.08)',
    mockupLines: ['Inscription', 'Coaching', 'Suivi client'],
  },
  real_estate: {
    gradient: 'linear-gradient(145deg, #0c1929 0%, #0c3547 40%, #061525 100%)',
    accent: '#06b6d4',
    accentLight: 'rgba(6,182,212,0.12)',
    accentBorder: 'rgba(6,182,212,0.25)',
    icon: <Building2 className="w-5 h-5" />,
    glow: 'radial-gradient(ellipse at 30% 50%, rgba(6,182,212,0.2) 0%, transparent 60%)',
    orb1: 'rgba(6,182,212,0.15)',
    orb2: 'rgba(16,185,129,0.08)',
    mockupLines: ['Biens immobiliers', 'Visites', 'Contact'],
  },
  renovation: {
    gradient: 'linear-gradient(145deg, #1a1408 0%, #422006 40%, #1a1408 100%)',
    accent: '#f59e0b',
    accentLight: 'rgba(245,158,11,0.12)',
    accentBorder: 'rgba(245,158,11,0.25)',
    icon: <HardHat className="w-5 h-5" />,
    glow: 'radial-gradient(ellipse at 30% 50%, rgba(245,158,11,0.2) 0%, transparent 60%)',
    orb1: 'rgba(245,158,11,0.15)',
    orb2: 'rgba(120,113,108,0.08)',
    mockupLines: ['Demandes devis', 'Chantiers', 'Suivi projet'],
  },
};

const DEFAULT_THEME = {
  gradient: 'linear-gradient(145deg, #1e293b 0%, #334155 40%, #1e293b 100%)',
  accent: '#94a3b8',
  accentLight: 'rgba(148,163,184,0.12)',
  accentBorder: 'rgba(148,163,184,0.25)',
  icon: <LayoutGrid className="w-5 h-5" />,
  glow: 'radial-gradient(ellipse at 30% 50%, rgba(148,163,184,0.15) 0%, transparent 60%)',
  orb1: 'rgba(148,163,184,0.1)',
  orb2: 'rgba(100,116,139,0.08)',
  mockupLines: ['Page principale', 'Sections', 'Contact'],
};

function TemplateCard({ template, isActive, isApplying, onPreview, onApply, t }: {
  template: SiteTemplate;
  isActive: boolean;
  isApplying: boolean;
  onPreview: () => void;
  onApply: () => void;
  t: ReturnType<typeof useThemeTokens>;
}) {
  const theme = TEMPLATE_THEME[template.template_key] ?? DEFAULT_THEME;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: t.card.bg,
        border: `1px solid ${isActive ? theme.accentBorder : hovered ? `${theme.accent}20` : t.card.border}`,
        boxShadow: isActive
          ? `0 0 0 1px ${theme.accentBorder}, 0 8px 32px ${theme.accent}15`
          : hovered
            ? `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px ${theme.accent}10`
            : '0 1px 3px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Visual banner with mockup */}
      <div className="relative h-44 overflow-hidden" style={{ background: theme.gradient }}>
        {/* Glow effect */}
        <div className="absolute inset-0" style={{ background: theme.glow }} />

        {/* Decorative orbs */}
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full transition-transform duration-500"
          style={{
            background: theme.orb1,
            filter: 'blur(30px)',
            transform: hovered ? 'scale(1.3)' : 'scale(1)',
          }}
        />
        <div
          className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full transition-transform duration-500"
          style={{
            background: theme.orb2,
            filter: 'blur(25px)',
            transform: hovered ? 'scale(1.2)' : 'scale(1)',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(${theme.accent} 1px, transparent 1px), linear-gradient(90deg, ${theme.accent} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Mini mockup preview */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[110px]">
          <div
            className="rounded-lg overflow-hidden transition-all duration-500"
            style={{
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${theme.accent}25`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 ${theme.accent}10`,
              transform: hovered ? 'scale(1.05) rotate(-1deg)' : 'scale(1) rotate(0deg)',
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-1 px-2 py-1.5" style={{ borderBottom: `1px solid ${theme.accent}15` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444', opacity: 0.6 }} />
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#eab308', opacity: 0.6 }} />
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', opacity: 0.6 }} />
              <div className="ml-1 flex-1 h-2 rounded-sm" style={{ background: `${theme.accent}15` }} />
            </div>
            {/* Mockup content lines */}
            <div className="px-2.5 py-2.5 space-y-2">
              <div className="h-1.5 rounded-full w-3/4" style={{ background: `${theme.accent}30` }} />
              <div className="h-1 rounded-full w-full" style={{ background: `${theme.accent}12` }} />
              <div className="h-1 rounded-full w-5/6" style={{ background: `${theme.accent}10` }} />
              <div className="flex gap-1 pt-1">
                <div className="h-5 flex-1 rounded" style={{ background: `${theme.accent}12` }} />
                <div className="h-5 flex-1 rounded" style={{ background: `${theme.accent}08` }} />
              </div>
              <div className="h-8 rounded" style={{ background: `${theme.accent}08` }} />
              <div className="flex gap-1">
                <div className="h-1 rounded-full flex-1" style={{ background: `${theme.accent}10` }} />
                <div className="h-1 rounded-full w-1/3" style={{ background: `${theme.accent}08` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Left side info */}
        <div className="absolute left-4 bottom-4 right-[130px]">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: `${theme.accent}20`,
                border: `1px solid ${theme.accent}30`,
                color: theme.accent,
                boxShadow: `0 0 12px ${theme.accent}20`,
              }}
            >
              {theme.icon}
            </div>
            <div className="flex flex-col gap-0.5">
              {theme.mockupLines.map((line, i) => (
                <span
                  key={i}
                  className="text-[8px] font-medium leading-none"
                  style={{ color: i === 0 ? `${theme.accent}` : `rgba(255,255,255,${0.35 - i * 0.08})` }}
                >
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Active badge */}
        {isActive && (
          <div
            className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
            style={{
              background: 'rgba(22,163,106,0.9)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(22,163,106,0.4)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Check className="w-3 h-3" />
            Actif
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Title + Category row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate" style={{ color: t.text.primary }}>{template.name}</h3>
            <span
              className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider"
              style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}`, color: theme.accent }}
            >
              {template.category}
            </span>
          </div>
          {template.is_default && (
            <span
              className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold"
              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#0ea5e9' }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              Par defaut
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-[11px] leading-[1.6] line-clamp-2" style={{ color: t.text.tertiary }}>
          {template.description}
        </p>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onPreview}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: t.surface.secondary,
              border: `1px solid ${t.surface.border}`,
              color: t.text.secondary,
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            Apercu
          </button>
          <button
            onClick={onApply}
            disabled={isActive || isApplying}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-not-allowed"
            style={{
              background: isActive
                ? 'rgba(22,163,106,0.08)'
                : `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`,
              border: isActive ? `1px solid rgba(22,163,106,0.2)` : 'none',
              color: isActive ? '#16a34a' : '#fff',
              boxShadow: isActive ? 'none' : `0 4px 14px ${theme.accent}30`,
              opacity: (isActive || isApplying) ? 0.7 : 1,
            }}
          >
            {isApplying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isActive ? (
              <><Check className="w-3.5 h-3.5" /> Actif</>
            ) : (
              <>
                Appliquer
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
