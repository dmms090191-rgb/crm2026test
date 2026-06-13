import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useEditorMode, resolveZoneBg, type EditorZone } from '../../contexts/EditorModeContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useVisualCustomizeSafe } from '../visualCustomize/VisualCustomizeContext';
import { supabase } from '../../lib/supabase';
import SaveThemeFormFields from './SaveThemeFormFields';

const CUSTOM_CATEGORY_SLUG = 'themes-personnalises';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  ownerUserId?: string | null;
  ownerCompanyId?: string | null;
}

export default function EditorSaveThemeModal({ open, onClose, onSaved, ownerUserId, ownerCompanyId }: Props) {
  const { zoneOverrides, getOverridesWithPreview, getTextOverridesWithPreview, commitPreview, commitTextPreview, textOverrides, backgroundImage, backgroundImageZoom, backgroundImagePositionX, backgroundImagePositionY, backgroundImageFit, editingThemeKey, clearEditingTheme, typographyOverrides, customPanelPalette, buttonOverrides, cardOverrides } = useEditorMode();
  const t = useThemeTokens();
  const { theme: currentTheme } = useTheme();
  const vc = useVisualCustomizeSafe();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'visible' | 'hidden'>('visible');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<'new' | 'update' | 'copy'>('new');

  useEffect(() => {
    if (!open) return;
    setError('');
    setSuccess(false);
    setSaving(false);
    if (editingThemeKey) {
      setMode('update');
      loadExistingData();
    } else {
      setMode('new');
      setName('');
      setDescription('');
      setStatus('visible');
    }
  }, [open, editingThemeKey]);

  async function loadExistingData() {
    if (!editingThemeKey) return;
    const { data } = await supabase
      .from('theme_config')
      .select('label, description, status')
      .eq('theme_key', editingThemeKey)
      .maybeSingle();
    if (data) {
      setName(data.label || '');
      setDescription(data.description || '');
      setStatus(data.status === 'hidden' ? 'hidden' : 'visible');
    }
  }

  if (!open) return null;

  const vcSnapshot = vc?.getConfigsSnapshot() ?? {};
  const hasVcOverrides = Object.keys(vcSnapshot).length > 0;
  const hasOverrides = Object.values(zoneOverrides).some(Boolean) || Object.keys(textOverrides).length > 0 || !!backgroundImage || Object.keys(buttonOverrides).length > 0 || Object.keys(cardOverrides).length > 0 || hasVcOverrides;

  const buildThemeTokens = () => {
    const overrides = getOverridesWithPreview();
    const textOvr = getTextOverridesWithPreview();
    return {
      zone_overrides: overrides,
      zone_css: {
        zone1: overrides.zone1 ? resolveZoneBg(overrides.zone1) : null,
        zone2: overrides.zone2 ? resolveZoneBg(overrides.zone2) : null,
        zone3: overrides.zone3 ? resolveZoneBg(overrides.zone3) : null,
        zone4: overrides.zone4 ? resolveZoneBg(overrides.zone4) : null,
      },
      text_overrides: textOvr,
      background_image: backgroundImage || null,
      background_image_zoom: backgroundImageZoom !== 100 ? backgroundImageZoom : null,
      background_image_position_x: backgroundImagePositionX !== 0 ? backgroundImagePositionX : null,
      background_image_position_y: backgroundImagePositionY !== 0 ? backgroundImagePositionY : null,
      background_image_fit: backgroundImageFit !== 'cover' ? backgroundImageFit : null,
      typography_overrides: (typographyOverrides.categoryFont || typographyOverrides.itemFont || typographyOverrides.rdrFont) ? typographyOverrides : null,
      panel_palette: customPanelPalette || null,
      button_overrides: Object.keys(buttonOverrides).length > 0 ? buttonOverrides : null,
      card_overrides: Object.keys(cardOverrides).length > 0 ? cardOverrides : null,
      vc_overrides: hasVcOverrides ? vcSnapshot : null,
    };
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Veuillez entrer un nom'); return; }
    if (!hasOverrides) { setError('Aucune personnalisation a enregistrer'); return; }

    setSaving(true);
    setError('');

    try {
      commitPreview();
      commitTextPreview();
      const themeTokens = buildThemeTokens();

      if (mode === 'update' && editingThemeKey) {
        const { error: updateError } = await supabase
          .from('theme_config')
          .update({
            label: name.trim(),
            description: description.trim(),
            status,
            theme_tokens: themeTokens,
            created_from_theme: currentTheme,
            updated_at: new Date().toISOString(),
          })
          .eq('theme_key', editingThemeKey);
        if (updateError) throw updateError;
      } else {
        const themeKey = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const { data: customCat } = await supabase
          .from('theme_categories')
          .select('id')
          .eq('slug', CUSTOM_CATEGORY_SLUG)
          .maybeSingle();

        const { data: maxOrder } = await supabase
          .from('theme_config')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextOrder = (maxOrder?.display_order ?? 0) + 1;

        const resolvedOwnerId = ownerUserId ?? (await supabase.auth.getUser()).data.user?.id ?? null;

        const { error: insertError } = await supabase
          .from('theme_config')
          .insert({
            theme_key: themeKey,
            label: name.trim(),
            status,
            is_recommended: false,
            is_favorite: false,
            category: CUSTOM_CATEGORY_SLUG,
            category_id: customCat?.id ?? null,
            display_order: nextOrder,
            theme_tokens: themeTokens,
            created_from_theme: currentTheme,
            description: description.trim(),
            owner_user_id: resolvedOwnerId,
            owner_company_id: ownerCompanyId ?? null,
            is_shared: false,
          });
        if (insertError) throw insertError;
      }

      setSuccess(true);
      onSaved?.();
      setTimeout(() => {
        setSuccess(false);
        setName('');
        setDescription('');
        clearEditingTheme();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!editingThemeKey;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" style={{ background: t.modal.overlayBg }}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: t.modal.bg,
          border: `1px solid ${t.modal.border}`,
          boxShadow: t.modal.shadow,
        }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.modal.border}` }}>
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4" style={{ color: t.accent.solid }} />
            <span className="text-sm font-bold" style={{ color: t.heading.primary }}>
              {isEditing ? 'Modifier le theme' : 'Enregistrer dans Themes personnalises'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: t.label.muted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <SaveThemeFormFields
          zoneOverrides={zoneOverrides}
          isEditing={isEditing}
          mode={mode}
          setMode={setMode}
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          status={status}
          setStatus={setStatus}
          error={error}
          setError={setError}
          success={success}
          t={t}
        />

        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${t.accent.solid}, ${t.accent.bgHover})`,
              color: '#fff',
              border: `1px solid ${t.accent.border}`,
            }}
          >
            {saving
              ? 'Enregistrement...'
              : mode === 'update'
              ? 'Mettre a jour'
              : 'Enregistrer le theme'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
