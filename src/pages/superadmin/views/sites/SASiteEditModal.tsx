import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, Globe, ToggleLeft, ToggleRight } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import type { CompanyHomePageWithCompany } from '../../../../lib/companyHomePages';

interface Props {
  page: CompanyHomePageWithCompany;
  onClose: () => void;
  onSaved: () => void;
}

export default function SASiteEditModal({ page, onClose, onSaved }: Props) {
  const t = useThemeTokens();
  const [title, setTitle] = useState(page.title);
  const [subtitle, setSubtitle] = useState(page.subtitle);
  const [welcomeMessage, setWelcomeMessage] = useState(page.welcome_message);
  const [slug, setSlug] = useState(page.slug ?? '');
  const [isActive, setIsActive] = useState(page.is_active);
  const [logoUrl, setLogoUrl] = useState(page.logo_url ?? '');
  const [heroImageUrl, setHeroImageUrl] = useState(page.hero_image_url ?? '');
  const [mainColor, setMainColor] = useState(page.main_color ?? '#0ea5e9');
  const [secondaryColor, setSecondaryColor] = useState(page.secondary_color ?? '#10b981');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanSlug) { setError('Le slug est requis (lettres, chiffres, tirets).'); return; }
    setSaving(true);
    setError('');
    try {
      const { error: updateErr } = await supabase
        .from('company_home_pages')
        .update({
          title: title.trim(), subtitle: subtitle.trim(),
          welcome_message: welcomeMessage.trim(), logo_url: logoUrl.trim() || null,
          hero_image_url: heroImageUrl.trim() || null, main_color: mainColor, secondary_color: secondaryColor,
          slug: cleanSlug, is_active: isActive, updated_at: new Date().toISOString(),
        })
        .eq('id', page.id);
      if (updateErr) throw updateErr;
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('duplicate') && msg.includes('slug') ? 'Ce slug est deja utilise par un autre site.' : msg);
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" style={{ background: t.card.bg, border: `1px solid ${t.surface.border}` }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 rounded-t-2xl" style={{ background: t.card.bg, borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-2.5">
            <Globe className="w-4.5 h-4.5" style={{ color: '#0ea5e9' }} />
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.text.primary }}>Gerer le site</h2>
              <p className="text-[11px]" style={{ color: t.text.tertiary }}>{page.companies?.name ?? 'Societe'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: t.text.tertiary }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

          <Field label="Titre de la page" t={t}>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle(t)} placeholder="Ex: Bienvenue chez DMA" />
          </Field>
          <Field label="Sous-titre" t={t}>
            <input value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle(t)} placeholder="Ex: Votre partenaire renovation" />
          </Field>
          <Field label="Message d'accueil" t={t}>
            <textarea value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none" style={inputStyle(t)} placeholder="Texte affiche sous le titre..." />
          </Field>
          <Field label="Slug (URL)" t={t}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] flex-shrink-0" style={{ color: t.text.tertiary }}>/site/</span>
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle(t)} placeholder="dma" />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Couleur principale" t={t}>
              <div className="flex items-center gap-2">
                <input type="color" value={mainColor} onChange={e => setMainColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0" style={{ background: 'transparent' }} />
                <input value={mainColor} onChange={e => setMainColor(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle(t)} />
              </div>
            </Field>
            <Field label="Couleur secondaire" t={t}>
              <div className="flex items-center gap-2">
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0" style={{ background: 'transparent' }} />
                <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle(t)} />
              </div>
            </Field>
          </div>
          <Field label="URL du logo" t={t} optional>
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle(t)} placeholder="https://..." />
          </Field>
          <Field label="URL image hero" t={t} optional>
            <input value={heroImageUrl} onChange={e => setHeroImageUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle(t)} placeholder="https://..." />
          </Field>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-medium" style={{ color: t.text.secondary }}>Page active</span>
            <button onClick={() => setIsActive(v => !v)} className="flex items-center gap-1.5">
              {isActive ? <ToggleRight className="w-6 h-6" style={{ color: '#10b981' }} /> : <ToggleLeft className="w-6 h-6" style={{ color: t.text.tertiary }} />}
              <span className="text-[11px] font-medium" style={{ color: isActive ? '#10b981' : t.text.tertiary }}>{isActive ? 'Active' : 'Inactive'}</span>
            </button>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-4 rounded-b-2xl" style={{ background: t.card.bg, borderTop: `1px solid ${t.surface.border}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ background: t.surface.primary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-60" style={{ background: '#0ea5e9' }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, children, t, optional }: { label: string; children: React.ReactNode; t: ReturnType<typeof useThemeTokens>; optional?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>{label}</label>
        {optional && <span className="text-[9px]" style={{ color: t.text.tertiary }}>optionnel</span>}
      </div>
      {children}
    </div>
  );
}

function inputStyle(t: ReturnType<typeof useThemeTokens>) {
  return { background: t.surface.primary, color: t.text.primary, border: `1px solid ${t.surface.border}` };
}
