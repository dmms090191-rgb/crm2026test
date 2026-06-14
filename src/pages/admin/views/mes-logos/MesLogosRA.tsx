import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FolderOpen, Image as ImageIcon, AlertTriangle, RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import type { LogoLibraryItem, BgMode } from './mesLogosTypes';
import LogoLibraryCard from './LogoLibraryCard';
import LogoBgModal from './LogoBgModal';

const ACCEPTED = '.png,.jpg,.jpeg,.webp,.svg';
const BUCKET = 'admin-logo-library';

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export default function MesLogosRA() {
  const t = useThemeTokens();
  const fileRef = useRef<HTMLInputElement>(null);

  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<LogoLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bgModal, setBgModal] = useState<LogoLibraryItem | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const cid = user?.app_metadata?.company_id as string | undefined;
      setResolvedCompanyId(cid ?? null);
    });
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!resolvedCompanyId) {
        setItems([]);
        return;
      }
      const { data, error: fetchErr } = await supabase
        .from('admin_logo_library')
        .select('*')
        .eq('company_id', resolvedCompanyId)
        .order('created_at', { ascending: false });
      if (fetchErr) throw fetchErr;
      setItems((data as LogoLibraryItem[]) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [resolvedCompanyId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !resolvedCompanyId) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${resolvedCompanyId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadErr) { console.error(uploadErr); continue; }
      const name = file.name.replace(/\.[^.]+$/, '');
      await supabase.from('admin_logo_library').insert({
        company_id: resolvedCompanyId,
        name,
        file_path: path,
        position: items.length,
      });
    }
    await fetchItems();
    setUploading(false);
  };

  const handleBgSave = async (mode: BgMode, c1: string, c2: string) => {
    if (!bgModal) return;
    await supabase.from('admin_logo_library').update({
      bg_mode: mode,
      bg_color1: c1,
      bg_color2: c2,
      updated_at: new Date().toISOString(),
    }).eq('id', bgModal.id);
    setItems(prev => prev.map(i =>
      i.id === bgModal.id ? { ...i, bg_mode: mode, bg_color1: c1, bg_color2: c2 } : i
    ));
    setBgModal(null);
  };

  const handleDownload = async (item: LogoLibraryItem) => {
    const url = getPublicUrl(item.file_path);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name || 'logo';
    a.target = '_blank';
    a.click();
  };

  const handleDelete = async (item: LogoLibraryItem) => {
    await supabase.storage.from(BUCKET).remove([item.file_path]);
    await supabase.from('admin_logo_library').delete().eq('id', item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.card.title }}>
            Mes logos RA
          </h1>
          <p className="text-sm mt-1" style={{ color: t.card.subtitle }}>
            Bibliothèque de vos logos personnels
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 shadow-lg disabled:opacity-50"
          style={{ background: t.button.primaryBg, color: t.button.primaryText }}
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Upload...' : 'Uploader un logo'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${t.button.primaryBg} transparent ${t.button.primaryBg} ${t.button.primaryBg}` }} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#fee2e220' }}>
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-base font-semibold" style={{ color: t.card.title }}>
            Impossible de charger les logos
          </p>
          <p className="text-sm mt-1 text-center max-w-xs" style={{ color: t.card.subtitle }}>
            {error}
          </p>
          <button
            onClick={fetchItems}
            className="flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
            style={{ background: t.button.primaryBg, color: t.button.primaryText }}
          >
            <RefreshCw className="w-4 h-4" />
            Reessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed transition-colors duration-200 cursor-pointer hover:opacity-80"
          style={{ borderColor: t.card.border, background: t.card.bg + '60' }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: t.button.primaryBg + '15' }}>
            <FolderOpen className="w-8 h-8" style={{ color: t.button.primaryBg }} />
          </div>
          <p className="text-base font-semibold" style={{ color: t.card.title }}>
            Aucun logo pour le moment
          </p>
          <p className="text-sm mt-1 text-center max-w-xs" style={{ color: t.card.subtitle }}>
            Cliquez ou glissez-déposez un fichier PNG, JPG, WEBP ou SVG
          </p>
          <div className="flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: t.button.primaryBg + '15', color: t.button.primaryBg }}>
            <ImageIcon className="w-4 h-4" />
            Ajouter un logo
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          {items.map(item => (
            <LogoLibraryCard
              key={item.id}
              item={item}
              logoUrl={getPublicUrl(item.file_path)}
              onEditBg={() => setBgModal(item)}
              onDownload={() => handleDownload(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {bgModal && (
        <LogoBgModal
          open
          onClose={() => setBgModal(null)}
          initialMode={bgModal.bg_mode}
          initialColor1={bgModal.bg_color1}
          initialColor2={bgModal.bg_color2}
          logoUrl={getPublicUrl(bgModal.file_path)}
          onSave={handleBgSave}
        />
      )}
    </div>
  );
}
