import { useState, useMemo, useCallback } from 'react';
import { Search, RefreshCw, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AiGeneratedImage } from './editeurIaTypes';
import ImageLibraryCard from './ImageLibraryCard';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

const PAGE_SIZE = 20;

interface Props {
  images: AiGeneratedImage[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (image: AiGeneratedImage) => void;
  onRefresh: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDownload: (url: string, name: string) => void;
  onUseAsZone4: (url: string) => void;
}

export default function ImageLibrary({
  images, loading, selectedId, onSelect, onRefresh, onRename, onDelete, onDownload, onUseAsZone4,
}: Props) {
  const t = useThemeTokens();
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = images;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) || i.prompt.toLowerCase().includes(q),
      );
    }
    if (filterOp !== 'all') {
      list = list.filter(i => i.operation === filterOp);
    }
    return list;
  }, [images, search, filterOp]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageImages = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleDownload = useCallback((url: string, name: string) => {
    onDownload(url, name);
  }, [onDownload]);

  return (
    <div
      className="flex flex-col h-full border-l"
      style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        borderColor: t.surface.border,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-sm font-bold text-white/80">Bibliotheque des images creees</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors disabled:opacity-30"
            title="Actualiser"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`p-1.5 rounded-lg transition-colors ${
              showFilters ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-white/[0.06] text-white/30 hover:text-white/60'
            }`}
            title="Filtres"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Rechercher une image..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/70 placeholder-white/20 outline-none focus:border-cyan-500/20 transition-colors"
          />
        </div>
      </div>

      {showFilters && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {['all', 'generate', 'img2img', 'outpaint', 'upscale'].map(op => (
            <button
              key={op}
              onClick={() => { setFilterOp(op); setPage(0); }}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                filterOp === op
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20'
                  : 'text-white/30 bg-white/[0.03] border border-white/[0.04] hover:text-white/50'
              }`}
            >
              {op === 'all' ? 'Tous' : op === 'generate' ? 'Generation' : op === 'img2img' ? 'Img2Img' : op === 'outpaint' ? 'Outpaint' : 'Upscale'}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 space-y-1.5">
        {pageImages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[11px] text-white/25">Aucune image trouvee</p>
          </div>
        )}
        {pageImages.map(img => (
          <ImageLibraryCard
            key={img.id}
            image={img}
            isActive={selectedId === img.id}
            onSelect={() => onSelect(img)}
            onRename={(name) => onRename(img.id, name)}
            onDownload={() => handleDownload(img.generated_image_url, img.name)}
            onDelete={() => onDelete(img.id)}
            onUseAsZone4={() => onUseAsZone4(img.generated_image_url)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06]">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] disabled:opacity-20 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-white/30">
            {filtered.length} images
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] disabled:opacity-20 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
