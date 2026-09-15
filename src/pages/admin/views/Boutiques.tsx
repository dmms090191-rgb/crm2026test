import { lazy, Suspense, useState } from 'react';
import { Plus } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useBoutiques } from './boutiques/useBoutiques';
import BoutiquesTable from './boutiques/BoutiquesTable';
import BoutiqueCreateModal from './boutiques/BoutiqueCreateModal';
import type { Boutique } from './boutiques/boutiqueTypes';
import BarriereErreur from '../../../boutique3d/BarriereErreur';

/**
 * LA FRONTIERE DE CHARGEMENT DE LA 3D.
 *
 * `lazy()` n'est pas un confort ici, c'est la condition pour que le reste de Talvex reste
 * leger : le moteur, three.js et la feuille de style de la boutique pesent environ 1,2 Mo.
 * Un import STATIQUE les ferait entrer dans le paquet d'entree — servi sur le tableau de bord,
 * le CRM, l'agenda et le chat. Aucun `manualChunks` n'est declare dans ce projet : rien ne
 * rattraperait l'erreur. Elle se verrait seulement a la taille du paquet.
 *
 * Les gros fichiers (GLB, textures, musiques) ne partent pas non plus avec ce module : le
 * moteur va les chercher a l'execution, une fois monte.
 */
const BoutiqueVue3D = lazy(() => import('../../../boutique3d/BoutiqueVue3D'));

/**
 * Page « Boutiques » du panel Societe.
 *
 * Une Societe gere PLUSIEURS boutiques : cette page en est la liste. Depuis cette etape, une
 * boutique dont le modele est connu s'OUVRE en 3D, dans la meme page : la liste laisse la place
 * a la scene, et le bouton « Boutiques » la rend.
 */
export default function Boutiques() {
  const t = useThemeTokens();
  const { boutiques, loading, error, create } = useBoutiques();
  const [showCreate, setShowCreate] = useState(false);
  const [ouverte, setOuverte] = useState<Boutique | null>(null);

  // La scene remplace la liste plutot que de s'ajouter en dessous : deux surfaces de cette
  // taille dans la meme page se disputeraient le defilement, et la 3D perdrait sa hauteur.
  if (ouverte) {
    return (
      <BarriereErreur
        secours={(erreur, reessayer) => (
          <div className="space-y-4">
            <button type="button" onClick={() => { reessayer(); setOuverte(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
              ← Revenir aux boutiques
            </button>
            <p className="text-sm px-4 py-3 rounded-lg"
              style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
              La boutique 3D n’a pas pu s’ouvrir. {erreur.message}
            </p>
          </div>
        )}
      >
        <Suspense fallback={<Chargement t={t} />}>
          <BoutiqueVue3D boutique={ouverte} onFermer={() => setOuverte(null)} />
        </Suspense>
      </BarriereErreur>
    );
  }

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

      <BoutiquesTable boutiques={boutiques} loading={loading} onOuvrir={setOuverte} />

      {showCreate && (
        <BoutiqueCreateModal onClose={() => setShowCreate(false)} onCreate={create} />
      )}
    </div>
  );
}

/** Meme attente que les autres vues paresseuses du tableau de bord. */
function Chargement({ t }: { t: ReturnType<typeof useThemeTokens> }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 rounded-full animate-spin"
        style={{ borderColor: t.accent.border, borderTopColor: 'transparent' }} />
    </div>
  );
}
