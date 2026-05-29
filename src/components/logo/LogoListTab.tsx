import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, GripVertical, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { notifyLogoChanged } from '../../hooks/useActiveLogo';
import { supabase } from '../../lib/supabase';
import LogoCard, { type CompanyLogo } from './LogoCard';
import LogoEditorModal from './LogoEditorModal';
import LogoListToolbar from './LogoListToolbar';
import LogoListScalePanel from './LogoListScalePanel';
import LogoListEmpty from './LogoListEmpty';
import { MAX_FILE_SIZE, ACCEPTED_TYPES, ACCEPT_STRING, extractStoragePath } from './logoListHelpers';

interface Props {
  companyId: string | null;
  onSwitchToAi?: () => void;
}

export default function LogoListTab({ companyId, onSwitchToAi }: Props) {
  const t = useThemeTokens();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logos, setLogos] = useState<CompanyLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'select' | 'delete' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingLogo, setEditingLogo] = useState<CompanyLogo | null>(null);
  const [showScale, setShowScale] = useState(false);
  const [logoScale, setLogoScale] = useState(1);
  const scaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMsg = useCallback(() => { setTimeout(() => setMessage(null), 5000); }, []);

  const fetchLogos = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('company_logos').select('*').eq('company_id', companyId)
        .order('position', { ascending: true }).order('created_at', { ascending: false });
      if (error) throw error;
      setLogos((data ?? []) as CompanyLogo[]);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { fetchLogos(); }, [fetchLogos]);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase.from('company_home_pages').select('logo_scale')
        .eq('company_id', companyId).limit(1).maybeSingle();
      if (data?.logo_scale != null) setLogoScale(data.logo_scale);
    })();
  }, [companyId]);

  const saveScale = useCallback((value: number) => {
    if (!companyId) return;
    if (scaleTimerRef.current) clearTimeout(scaleTimerRef.current);
    scaleTimerRef.current = setTimeout(async () => {
      await supabase.from('company_home_pages')
        .update({ logo_scale: value, updated_at: new Date().toISOString() })
        .eq('company_id', companyId);
      notifyLogoChanged();
    }, 300);
  }, [companyId]);

  const handleScaleChange = (value: number) => { setLogoScale(value); saveScale(value); };

  const handleUpload = async (file: File) => {
    if (!companyId) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Format non supporte. Utilisez PNG, JPG, WEBP ou SVG.' }); clearMsg(); return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'Fichier trop volumineux. Taille maximale : 2 Mo.' }); clearMsg(); return;
    }
    setUploading(true); setMessage(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${companyId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('company-logos').upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('company-logos').getPublicUrl(filePath);
      const maxPos = logos.length > 0 ? Math.max(...logos.map(l => l.position)) + 1 : 0;
      const { error: dbErr } = await supabase.from('company_logos').insert({
        company_id: companyId, url: pub.publicUrl, file_name: file.name,
        is_active: logos.length === 0, position: maxPos,
      });
      if (dbErr) throw dbErr;
      setMessage({ type: 'success', text: 'Logo ajoute a la liste.' });
      notifyLogoChanged(); await fetchLogos();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `Erreur : ${e instanceof Error ? e.message : String(e)}` });
    } finally { setUploading(false); clearMsg(); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSelect = async (id: string) => {
    if (!companyId) return;
    setActionId(id); setActionType('select');
    try {
      await supabase.from('company_logos').update({ is_active: false }).eq('company_id', companyId);
      const { error } = await supabase.from('company_logos').update({ is_active: true }).eq('id', id);
      if (error) throw error;
      const selected = logos.find(l => l.id === id);
      if (selected) {
        await supabase.from('company_home_pages')
          .update({ logo_url: selected.url, updated_at: new Date().toISOString() }).eq('company_id', companyId);
      }
      setMessage({ type: 'success', text: 'Logo selectionne comme actif.' });
      notifyLogoChanged(); await fetchLogos();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `Erreur : ${e instanceof Error ? e.message : String(e)}` });
    } finally { setActionId(null); setActionType(null); clearMsg(); }
  };

  const handleDelete = async (id: string) => {
    setActionId(id); setActionType('delete');
    try {
      const logo = logos.find(l => l.id === id);
      if (logo) {
        const path = extractStoragePath(logo.url);
        if (path) {
          const { error: storageErr } = await supabase.storage.from('company-logos').remove([path]);
          if (storageErr) console.warn(`[LogoDelete] Storage delete failed for path "${path}": ${storageErr.message}`);
        }
      }
      const { error } = await supabase.from('company_logos').delete().eq('id', id);
      if (error) throw error;
      if (logo?.is_active && companyId) {
        const remaining = logos.filter(l => l.id !== id);
        if (remaining.length > 0) {
          await supabase.from('company_logos').update({ is_active: true }).eq('id', remaining[0].id);
          await supabase.from('company_home_pages')
            .update({ logo_url: remaining[0].url, updated_at: new Date().toISOString() }).eq('company_id', companyId);
        } else {
          await supabase.from('company_home_pages')
            .update({ logo_url: null, updated_at: new Date().toISOString() }).eq('company_id', companyId);
        }
      }
      setMessage({ type: 'success', text: 'Logo supprime definitivement (base de donnees + fichier).' });
      notifyLogoChanged(); await fetchLogos();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `Erreur : ${e instanceof Error ? e.message : String(e)}` });
    } finally { setActionId(null); setActionType(null); clearMsg(); }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = logos.findIndex(l => l.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= logos.length) return;
    const updated = [...logos];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    updated.forEach((l, i) => { l.position = i; });
    setLogos(updated);
    await Promise.all(updated.map((l, i) => supabase.from('company_logos').update({ position: i }).eq('id', l.id)));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#d97706' }} />
        <p className="text-xs font-medium" style={{ color: t.text.tertiary }}>Chargement des logos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept={ACCEPT_STRING} className="hidden" onChange={handleFileChange} />

      <LogoListToolbar
        logoCount={logos.length} hasActive={logos.some(l => l.is_active)}
        uploading={uploading} companyId={companyId} reordering={reordering} showScale={showScale}
        onUploadClick={() => fileRef.current?.click()}
        onToggleReorder={() => setReordering(v => !v)}
        onToggleScale={() => setShowScale(v => !v)}
      />

      {showScale && (
        <LogoListScalePanel
          logoScale={logoScale} onScaleChange={handleScaleChange}
          activeLogo={logos.find(l => l.is_active)}
        />
      )}

      {reordering && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: '#d97706' }} />
          <p className="text-xs font-medium" style={{ color: '#d97706' }}>
            Utilisez les fleches pour changer l'ordre de vos logos.
          </p>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-medium"
          style={{
            background: message.type === 'success' ? 'rgba(22,163,106,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${message.type === 'success' ? 'rgba(22,163,106,0.15)' : 'rgba(239,68,68,0.15)'}`,
            color: message.type === 'success' ? '#16a34a' : '#ef4444',
          }}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {logos.length === 0 ? (
        <LogoListEmpty onUpload={() => fileRef.current?.click()} onSwitchToAi={onSwitchToAi} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {logos.map((logo, idx) => (
            <LogoCard key={logo.id} logo={logo} reordering={reordering} isFirst={idx === 0} isLast={idx === logos.length - 1}
              onSelect={handleSelect} onDelete={handleDelete} onMoveUp={id => handleMove(id, 'up')} onMoveDown={id => handleMove(id, 'down')}
              onEdit={l => setEditingLogo(l)} selecting={actionId === logo.id && actionType === 'select'} deleting={actionId === logo.id && actionType === 'delete'} />
          ))}
        </div>
      )}

      {editingLogo && companyId && (
        <LogoEditorModal logo={editingLogo} companyId={companyId} onClose={() => setEditingLogo(null)}
          onSaved={() => { setEditingLogo(null); setMessage({ type: 'success', text: 'Logo edite sauvegarde.' }); clearMsg(); fetchLogos(); }} />
      )}
    </div>
  );
}
