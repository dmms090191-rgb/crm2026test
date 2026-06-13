import { Link2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { CompanyHomePage } from '../../../../lib/companyHomePages';
import CopyButton from '../../../../components/CopyButton';

interface Props {
  page: CompanyHomePage;
  publicUrl: string | null;
}

export default function SiteDomainInternalCard({ page, publicUrl }: Props) {
  const t = useThemeTokens();

  return (
    <div className="rounded-xl p-5 space-y-4 transition-all" style={{
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.55), rgba(15, 23, 42, 0.65))',
      border: '1px solid rgba(148, 163, 184, 0.15)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.30)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 0 16px rgba(22,163,106,0.3)' }}>
          <Link2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Lien interne Talvex</h3>
          <p className="text-[10px]" style={{ color: t.text.quaternary }}>Accessible sans domaine personnalise</p>
        </div>
      </div>
      <div className="space-y-3 pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Site interne actif</span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{
              background: page.is_active ? 'rgba(22,163,106,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${page.is_active ? 'rgba(22,163,106,0.15)' : 'rgba(239,68,68,0.15)'}`,
              color: page.is_active ? '#16a34a' : '#ef4444',
            }}
          >
            {page.is_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {page.is_active ? 'Oui' : 'Non'}
          </span>
        </div>
        {page.slug && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>Lien interne</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: t.text.secondary }}>/site/{page.slug}</span>
              <CopyButton value={`/site/${page.slug}`} />
              {publicUrl && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
                  <ExternalLink className="w-3 h-3" style={{ color: '#0ea5e9' }} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
