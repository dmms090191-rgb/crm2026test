import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getHomePageByCompanyId, upsertHomePage } from '../../../../lib/companyHomePages';
import type { AdminUser } from '../SAAdmins';

interface AdminHomePageModalProps {
  admin: AdminUser;
  onClose: () => void;
}

function AdminHomePageModal({ admin, onClose }: AdminHomePageModalProps) {
  const tokens = useThemeTokens();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [mainColor, setMainColor] = useState('#0ea5e9');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (!admin.company_id) { setLoading(false); return; }
    getHomePageByCompanyId(admin.company_id)
      .then((page) => {
        if (page) {
          setSlug(page.slug ?? '');
          setTitle(page.title);
          setSubtitle(page.subtitle);
          setWelcomeMessage(page.welcome_message);
          setLogoUrl(page.logo_url ?? '');
          setMainColor(page.main_color ?? '#0ea5e9');
          setSecondaryColor(page.secondary_color ?? '#10b981');
          setHeroImageUrl(page.hero_image_url ?? '');
          setIsActive(page.is_active);
        }
      })
      .catch(() => setError('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, [admin.company_id]);

  const handleSave = async () => {
    if (!admin.company_id) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      await upsertHomePage({
        company_id: admin.company_id,
        slug: normalizedSlug || null,
        title,
        subtitle,
        welcome_message: welcomeMessage,
        logo_url: logoUrl || null,
        main_color: mainColor || null,
        secondary_color: secondaryColor || null,
        hero_image_url: heroImageUrl || null,
        custom_domain: null,
        domain_status: 'not_configured',
        domain_verified: false,
        is_active: isActive,
      });
      setSuccess('Page enregistrée');
      setTimeout(() => setSuccess(''), 2500);
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: tokens.input?.bg ?? tokens.surface.main,
    border: `1px solid ${tokens.input?.border ?? tokens.surface.border}`,
    color: tokens.input?.text ?? tokens.text.primary,
  };

  return createPortal(
    <div
      className="flex items-center justify-center p-4"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
        zIndex: 99999, background: tokens.modal.overlayBg,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: tokens.modal.shadow, maxHeight: '90dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: tokens.modal.title }}>
              Page d'accueil — {admin.company || 'Sans société'}
            </p>
            <p className="text-xs" style={{ color: tokens.modal.subtitle }}>{admin.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: tokens.accent.text }} />
            </div>
          ) : !admin.company_id ? (
            <p className="text-sm text-center py-8" style={{ color: tokens.text.tertiary }}>Cet admin n'est rattaché à aucune société.</p>
          ) : (
            <>
              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.label.primary }}>Slug (URL du site)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="mon-entreprise"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                />
                {slug && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ExternalLink className="w-3 h-3" style={{ color: tokens.text.tertiary }} />
                    <span className="text-[11px] font-mono" style={{ color: tokens.text.tertiary }}>/site/{slug}</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <Field label="Titre" value={title} onChange={setTitle} placeholder="Bienvenue chez..." inputStyle={inputStyle} tokens={tokens} />

              {/* Subtitle */}
              <Field label="Sous-titre" value={subtitle} onChange={setSubtitle} placeholder="Votre espace personnel" inputStyle={inputStyle} tokens={tokens} />

              {/* Welcome message */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.label.primary }}>Message d'accueil</label>
                <textarea
                  value={welcomeMessage}
                  onChange={e => setWelcomeMessage(e.target.value)}
                  placeholder="Bienvenue sur votre tableau de bord..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                  style={inputStyle}
                />
              </div>

              {/* Logo URL */}
              <Field label="URL du logo" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." inputStyle={inputStyle} tokens={tokens} />

              {/* Hero image URL */}
              <Field label="URL image héro" value={heroImageUrl} onChange={setHeroImageUrl} placeholder="https://..." inputStyle={inputStyle} tokens={tokens} />

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Couleur principale" value={mainColor} onChange={setMainColor} tokens={tokens} />
                <ColorField label="Couleur secondaire" value={secondaryColor} onChange={setSecondaryColor} tokens={tokens} />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-semibold" style={{ color: tokens.label.primary }}>Page active</span>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
                    border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
                    color: isActive ? '#10b981' : '#94a3b8',
                  }}
                >
                  {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {isActive ? 'Visible' : 'Masquée'}
                </button>
              </div>

              {/* Feedback */}
              {error && <p className="text-xs font-medium text-red-400">{error}</p>}
              {success && <p className="text-xs font-medium text-emerald-400">{success}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && admin.company_id && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${tokens.surface.border}` }}>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ color: tokens.text.tertiary }}>Annuler</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: tokens.accent.text, color: '#fff' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Enregistrer
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function Field({ label, value, onChange, placeholder, inputStyle, tokens }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
  inputStyle: React.CSSProperties; tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.label.primary }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={inputStyle}
      />
    </div>
  );
}

function ColorField({ label, value, onChange, tokens }: {
  label: string; value: string; onChange: (v: string) => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.label.primary }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{ background: tokens.input?.bg ?? tokens.surface.main, border: `1px solid ${tokens.input?.border ?? tokens.surface.border}`, color: tokens.input?.text ?? tokens.text.primary }}
        />
      </div>
    </div>
  );
}

export default AdminHomePageModal;