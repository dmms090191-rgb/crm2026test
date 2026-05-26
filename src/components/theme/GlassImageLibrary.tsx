import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Check, Loader2, ImagePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface LibraryImage {
  id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  created_at: string;
}

interface Props {
  selectedUrl: string;
  onSelect: (url: string) => void;
  accent: string;
  tokens: ThemeTokens;
}

export default function GlassImageLibrary({ selectedUrl, onSelect, accent, tokens }: Props) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error: err } = await supabase
      .from('glass_library_images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!err && data) setImages(data);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setError('Format : JPG, PNG ou WebP'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 Mo'); return; }
    setError('');
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); setError('Non connecte'); return; }

    const ext = file.name.split('.').pop() || 'jpg';
    const storagePath = `${user.id}/glass-lib-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('theme-backgrounds')
      .upload(storagePath, file, { upsert: false });
    if (upErr) { setUploading(false); setError('Erreur upload'); return; }

    const { data: urlData } = supabase.storage
      .from('theme-backgrounds')
      .getPublicUrl(storagePath);

    const { data: row, error: insertErr } = await supabase
      .from('glass_library_images')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        filename: file.name,
      })
      .select()
      .maybeSingle();

    if (insertErr || !row) { setUploading(false); setError('Erreur enregistrement'); return; }
    setImages(prev => [row, ...prev]);
    onSelect(urlData.publicUrl);
    setUploading(false);
  }

  async function handleDelete(img: LibraryImage) {
    setDeletingId(img.id);
    await supabase.storage.from('theme-backgrounds').remove([img.storage_path]);
    await supabase.from('glass_library_images').delete().eq('id', img.id);
    setImages(prev => prev.filter(i => i.id !== img.id));
    if (selectedUrl === img.public_url) onSelect('');
    setDeletingId(null);
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />

      {/* Upload button */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.01] mb-3"
        style={{
          border: `2px dashed ${accent}30`,
          background: `${accent}08`,
          color: accent,
        }}
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ImagePlus className="w-4 h-4" />
        )}
        {uploading ? 'Envoi en cours...' : 'Ajouter une image'}
      </button>

      {error && (
        <p className="text-[10px] font-bold mb-2" style={{ color: tokens.danger.text }}>
          {error}
        </p>
      )}

      {/* Image grid */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: tokens.text.quaternary }} />
        </div>
      ) : images.length === 0 ? (
        <p className="text-[10px] font-medium text-center py-4" style={{ color: tokens.text.quaternary }}>
          Aucune image dans la bibliotheque
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map(img => {
            const isSelected = selectedUrl === img.public_url;
            const isDeleting = deletingId === img.id;
            return (
              <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-[4/3]">
                <button
                  onClick={() => onSelect(img.public_url)}
                  className="w-full h-full block"
                  style={{
                    boxShadow: isSelected
                      ? `inset 0 0 0 2.5px ${accent}`
                      : 'none',
                    borderRadius: '0.5rem',
                  }}
                >
                  <img
                    src={img.public_url}
                    alt={img.filename}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {isSelected && (
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-lg"
                      style={{ background: `${accent}30` }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: accent }}
                      >
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>

                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(img); }}
                  disabled={isDeleting}
                  className="absolute top-1 right-1 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {isDeleting ? (
                    <Loader2 className="w-3 h-3 animate-spin text-white/80" />
                  ) : (
                    <Trash2 className="w-3 h-3 text-red-400" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
