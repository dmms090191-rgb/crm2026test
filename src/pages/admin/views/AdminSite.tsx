import { useState, useEffect } from 'react';
import {
  Globe, ExternalLink, Link2, CheckCircle2, AlertCircle, Clock,
  Eye, EyeOff, Palette, Type, Image, MessageSquare, Send,
} from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useCompanyId } from '../../../hooks/useCompanyId';
import { getHomePageByCompanyId } from '../../../lib/companyHomePages';
import type { CompanyHomePage } from '../../../lib/companyHomePages';

const DOMAIN_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  not_configured: { label: 'Non configure', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
  pending: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
  verified: { label: 'Verifie', color: '#16a34a', bg: 'rgba(22,163,106,0.08)', border: 'rgba(22,163,106,0.15)' },
  error: { label: 'Erreur', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
};

export default function AdminSite() {
  const t = useThemeTokens();
  const companyId = useCompanyId();
  const [page, setPage] = useState<CompanyHomePage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    getHomePageByCompanyId(companyId)
      .then(data => setPage(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SiteHeader t={t} />
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: t.accent.border, borderTopColor: t.accent.text }} />
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="space-y-6">
        <SiteHeader t={t} />
        <div className="rounded-2xl p-8 sm:p-12 text-center" style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.borderLight}` }}>
            <Globe className="w-7 h-7" style={{ color: t.text.tertiary }} />
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: t.text.primary }}>Aucun site configure</h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: t.text.tertiary }}>
            Votre site public n'a pas encore ete cree. Contactez le Super Admin pour mettre en place la page publique de votre societe.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
            <Send className="w-3.5 h-3.5" />
            Contacter le Super Admin
          </div>
        </div>
      </div>
    );
  }

  const domainStatus = DOMAIN_STATUS_MAP[page.domain_status] ?? DOMAIN_STATUS_MAP.not_configured;
  const publicUrl = page.slug ? `${window.location.origin}/site/${page.slug}` : null;
  const domainUrl = page.custom_domain && page.domain_verified ? `https://${page.custom_domain}` : null;

  return (
    <div className="space-y-6">
      <SiteHeader t={t} />

      {/* Status + Links row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatusCard
          label="Statut du site"
          icon={page.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          value={page.is_active ? 'Actif' : 'Inactif'}
          valueColor={page.is_active ? '#16a34a' : '#ef4444'}
          valueBg={page.is_active ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)'}
          valueBorder={page.is_active ? 'rgba(22,163,106,0.15)' : 'rgba(239,68,68,0.15)'}
          t={t}
        />
        <StatusCard
          label="Lien public"
          icon={<Link2 className="w-4 h-4" />}
          value={page.slug ? `/site/${page.slug}` : 'Non configure'}
          valueColor={page.slug ? '#0ea5e9' : '#6b7280'}
          valueBg={page.slug ? 'rgba(14,165,233,0.08)' : 'rgba(107,114,128,0.08)'}
          valueBorder={page.slug ? 'rgba(14,165,233,0.15)' : 'rgba(107,114,128,0.15)'}
          url={publicUrl}
          t={t}
        />
        <StatusCard
          label="Domaine"
          icon={page.domain_status === 'verified' ? <CheckCircle2 className="w-4 h-4" /> : page.domain_status === 'error' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          value={page.custom_domain || domainStatus.label}
          valueColor={domainStatus.color}
          valueBg={domainStatus.bg}
          valueBorder={domainStatus.border}
          url={domainUrl}
          t={t}
        />
      </div>

      {/* Site information card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
              <Globe className="w-4 h-4" style={{ color: t.accent.text }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Informations du site</h3>
              <p className="text-[10px]" style={{ color: t.text.quaternary }}>Contenu actuel de votre page publique</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <InfoRow icon={<Type className="w-4 h-4" />} label="Titre" value={page.title || 'Non defini'} t={t} />
          <InfoRow icon={<Type className="w-4 h-4" />} label="Sous-titre" value={page.subtitle || 'Non defini'} t={t} />
          <InfoRow icon={<MessageSquare className="w-4 h-4" />} label="Message d'accueil" value={page.welcome_message || 'Non defini'} multiline t={t} />

          <div className="flex flex-wrap gap-3 pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <ColorChip label="Couleur principale" color={page.main_color ?? '#0ea5e9'} t={t} />
            <ColorChip label="Couleur secondaire" color={page.secondary_color ?? '#10b981'} t={t} />
          </div>

          {(page.logo_url || page.hero_image_url) && (
            <div className="flex flex-wrap gap-3 pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
              {page.logo_url && <MediaChip label="Logo" url={page.logo_url} t={t} />}
              {page.hero_image_url && <MediaChip label="Image hero" url={page.hero_image_url} t={t} />}
            </div>
          )}
        </div>
      </div>

      {/* Preview section */}
      {publicUrl && (
        <div className="rounded-2xl overflow-hidden" style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(22,163,106,0.08)', border: '1px solid rgba(22,163,106,0.15)' }}>
                <Eye className="w-4 h-4" style={{ color: '#16a34a' }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Apercu</h3>
                <p className="text-[10px]" style={{ color: t.text.quaternary }}>Visualisez votre page publique</p>
              </div>
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Voir le site
            </a>
          </div>
          <div className="p-5">
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.surface.border}`, height: 400 }}>
              <iframe
                src={publicUrl}
                title="Apercu du site"
                className="w-full h-full border-0"
                style={{ background: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Help card */}
      <div className="rounded-2xl p-5" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
            <Send className="w-4 h-4" style={{ color: t.accent.text }} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: t.text.primary }}>Besoin de modifier votre site ?</p>
            <p className="text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
              Les modifications du site sont gerees par le Super Admin. Utilisez le chat Super Admin pour demander des changements de contenu, de couleurs, d'images ou de domaine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteHeader({ t }: { t: ReturnType<typeof useThemeTokens> }) {
  return (
    <div>
      <h2 className="text-xl font-bold" style={{ color: t.heading.primary }}>Site</h2>
      <p className="text-xs mt-0.5" style={{ color: t.text.quaternary }}>Gerez le site public de votre societe.</p>
    </div>
  );
}

function StatusCard({ label, icon, value, valueColor, valueBg, valueBorder, url, t }: {
  label: string; icon: React.ReactNode; value: string; valueColor: string; valueBg: string; valueBorder: string; url?: string | null;
  t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: t.text.tertiary }}>{label}</p>
      <div className="flex items-center gap-2">
        <span style={{ color: valueColor }}>{icon}</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: valueBg, border: `1px solid ${valueBorder}`, color: valueColor }}>
          {value}
        </span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            <ExternalLink className="w-3 h-3" style={{ color: t.text.tertiary }} />
          </a>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, multiline, t }: {
  icon: React.ReactNode; label: string; value: string; multiline?: boolean;
  t: ReturnType<typeof useThemeTokens>;
}) {
  const isEmpty = !value || value === 'Non defini';
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 mt-0.5" style={{ color: t.text.tertiary }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: t.text.quaternary }}>{label}</p>
        <p className={`text-sm ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`} style={{ color: isEmpty ? t.text.quaternary : t.text.primary }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ColorChip({ label, color, t }: { label: string; color: string; t: ReturnType<typeof useThemeTokens> }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
      <Palette className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.text.tertiary }} />
      <span className="text-[10px] font-semibold" style={{ color: t.text.secondary }}>{label}</span>
      <span className="w-5 h-5 rounded-md flex-shrink-0" style={{ background: color, border: `1px solid ${t.surface.border}`, boxShadow: `0 0 8px ${color}40` }} />
      <span className="text-[10px] font-mono" style={{ color: t.text.tertiary }}>{color}</span>
    </div>
  );
}

function MediaChip({ label, url, t }: { label: string; url: string; t: ReturnType<typeof useThemeTokens> }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-[1.02]" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
      <Image className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.text.tertiary }} />
      <span className="text-[10px] font-semibold" style={{ color: t.text.secondary }}>{label}</span>
      <ExternalLink className="w-3 h-3" style={{ color: '#0ea5e9' }} />
    </a>
  );
}
