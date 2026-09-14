import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useBoutiques } from './boutiques/useBoutiques';
import BoutiquesTable from './boutiques/BoutiquesTable';
import BoutiqueCreateModal from './boutiques/BoutiqueCreateModal';

/**
 * Page « Boutiques » du panel Societe.
 *
 * Une Societe gere PLUSIEURS boutiques : cette page en est la liste.
 * Les elements futurs (3D, articles, ecrans, musique, lumieres, decoration)
 * appartiendront a UNE boutique et vivront dans des vues dediees — ils ne sont
 * pas developpes a cette etape.
 */
export default function Boutiques() {
  const t = useThemeTokens();
  const { boutiques, loading, error, create } = useBoutiques();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: t.text.primary }}>Boutiques</h2>
          <p className="text-xs mt-0.5" style={{ color: t.input.placeholder }}>
            Gérez les boutiques de votre société.
          </p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
          style={{ background: t.accent.solid, color: t.text.inverse }}>
          <Plus className="w-4 h-4" />
          Ajouter une boutique
        </button>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
          {error}
        </p>
      )}

      <BoutiquesTable boutiques={boutiques} loading={loading} />

      {showCreate && (
        <BoutiqueCreateModal onClose={() => setShowCreate(false)} onCreate={create} />
      )}
    </div>
  );
}
