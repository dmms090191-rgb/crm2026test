import { useEffect, useRef } from 'react';
import { Circle, ExternalLink, Rocket, Clock, LayoutGrid as Layout, History, Lock, Loader2 } from 'lucide-react';
import { formatRelativeTime } from '../../../../../lib/formatRelativeTime';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isPublished: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  lastPublishedAt: string | null;
  templateKey: string | null;
  publicUrl: string | null;
  isPublishing: boolean;
  onPublish: () => void;
  t: ThemeTokens;
}

const TEMPLATE_LABELS: Record<string, string> = {
  gold_buying: 'Rachat d\'Or',
  renewable_energy: 'Energie Renouvelable',
  heat_pump: 'Pompe a Chaleur',
  fitness: 'Fitness',
  real_estate: 'Immobilier',
  renovation: 'Renovation',
  talvex_official: 'Talvex Officiel',
  builder_ready: 'Builder Ready',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function StudioSiteStatus({
  isOpen, onClose, isPublished, hasUnsavedChanges,
  lastSavedAt, lastPublishedAt, templateKey, publicUrl,
  isPublishing, onPublish, t,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const statusColor = isPublished ? '#10b981' : '#f59e0b';
  const statusLabel = isPublished ? 'Publie' : 'Brouillon';
  const canPublish = !hasUnsavedChanges && !isPublishing;

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1.5 w-72 rounded-xl overflow-hidden z-50"
      style={{
        background: t.surface.primary,
        border: `1px solid ${t.surface.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      {/* Status header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `${statusColor}15`,
            border: `1px solid ${statusColor}30`,
          }}
        >
          <Circle className="w-3.5 h-3.5 fill-current" style={{ color: statusColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold" style={{ color: t.text.primary }}>{statusLabel}</p>
          <p className="text-[10px]" style={{ color: t.text.tertiary }}>
            {hasUnsavedChanges ? 'Modifications non sauvegardees' : isPublished ? 'Site en ligne' : 'Pret a publier'}
          </p>
        </div>
      </div>

      {/* Info rows */}
      <div className="px-4 py-2.5 space-y-2.5">
        {templateKey && (
          <InfoRow
            icon={<Layout className="w-3 h-3" />}
            label="Template"
            value={TEMPLATE_LABELS[templateKey] ?? templateKey}
            t={t}
          />
        )}
        {lastSavedAt && (
          <InfoRow
            icon={<Clock className="w-3 h-3" />}
            label="Derniere sauvegarde"
            value={formatRelativeTime(lastSavedAt)}
            tooltip={formatDate(lastSavedAt)}
            t={t}
          />
        )}
        {lastPublishedAt && (
          <InfoRow
            icon={<Rocket className="w-3 h-3" />}
            label="Derniere publication"
            value={formatDate(lastPublishedAt)}
            t={t}
            valueColor="#10b981"
          />
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 space-y-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        {publicUrl && isPublished && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: t.surface.secondary,
              border: `1px solid ${t.surface.border}`,
              color: t.text.secondary,
            }}
          >
            <ExternalLink className="w-3 h-3" />
            Ouvrir le site publie
          </a>
        )}

        <button
          onClick={onPublish}
          disabled={!canPublish}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            opacity: canPublish ? 1 : 0.4,
            cursor: canPublish ? 'pointer' : 'not-allowed',
          }}
        >
          {isPublishing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Rocket className="w-3 h-3" />
          )}
          {isPublishing ? 'Publication...' : 'Publier'}
        </button>

        <button
          disabled
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold opacity-40 cursor-not-allowed"
          style={{
            background: t.surface.secondary,
            border: `1px solid ${t.surface.border}`,
            color: t.text.tertiary,
          }}
        >
          <History className="w-3 h-3" />
          Versions du site
          <Lock className="w-2.5 h-2.5 ml-0.5" />
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, tooltip, valueColor, t }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip?: string;
  valueColor?: string;
  t: ThemeTokens;
}) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: t.text.quaternary }}>{icon}</span>
      <span className="text-[10px] font-medium flex-1" style={{ color: t.text.tertiary }}>{label}</span>
      <span
        className="text-[10px] font-semibold"
        style={{ color: valueColor ?? t.text.secondary }}
        title={tooltip}
      >
        {value}
      </span>
    </div>
  );
}
