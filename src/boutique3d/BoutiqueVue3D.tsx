import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { modele3DPour } from './modeles';
import { Boutique3D } from './moteur/monterBoutique';
import { creerAccesBoutique } from './accesBoutique';
import type { Boutique } from '../pages/admin/views/boutiques/boutiqueTypes';
import './moteur/styles.css';
import './hote-talvex.css';

/**
 * LE PONT entre Talvex et le moteur de boutique 3D.
 *
 * Il ne fait que quatre choses, et c'est voulu : resoudre le modele a partir de `template_key`,
 * fournir un CADRE positionne et de hauteur non nulle, passer le VRAI `boutiques.id` comme
 * identite, et rendre la main proprement.
 *
 * Ce fichier est la FRONTIERE DE CHARGEMENT. Tout ce qu'il importe — le moteur, three.js, la
 * feuille de style de la boutique — n'entre dans le navigateur que lorsqu'il est lui-meme
 * charge. Il doit donc toujours etre atteint par un `lazy()` : un import statique depuis la page
 * Boutiques ferait entrer 1,2 Mo de three.js dans le paquet d'entree, servi sur le tableau de
 * bord, le CRM, l'agenda et le chat.
 *
 * LE CADRE. `<main>` de Talvex n'est positionne que sous le theme glass. On ne s'appuie donc
 * jamais dessus : le cadre porte sa propre position et sa propre hauteur. C'est la seule chose
 * que le moteur exige de son hote — sans elle, le canvas vaut 0 px de haut et l'interface de la
 * boutique se cale sur la fenetre, par-dessus la barre laterale.
 */

interface Props {
  boutique: Boutique;
  onFermer: () => void;
}

/** Hauteur du cadre : assez grande pour que la scene respire, assez basse pour que l'en-tete
 *  de la page reste visible. Le plein ecran est la pour le reste. */
const HAUTEUR = 'min(76vh, 880px)';

export default function BoutiqueVue3D({ boutique, onFermer }: Props) {
  const t = useThemeTokens();
  const cadre = useRef<HTMLDivElement>(null);
  // Un seul acces pour la vie du composant. Il parle au client Supabase AUTHENTIFIE de Talvex :
  // la couche que le moteur sait construire tout seul partirait avec le role anonyme, et les
  // policies de `boutiques` — donc celle de `boutique_reglages` qui en decoule — sont
  // `TO authenticated`. Tant que la table n'existe pas, `lire` rend null et `ecrire` rend
  // false : la boutique s'ouvre sur son cache local, exactement comme avant.
  const acces = useMemo(() => creerAccesBoutique(), []);
  const [pleinEcran, setPleinEcran] = useState(false);

  // La version du modele vient de la boutique. Elle est OPTIONNELLE et doit le rester : une
  // boutique creee avant que la colonne existe n'en porte pas, et retombe alors sur la version
  // livree du modele — le comportement d'avant, a l'identique.
  const modele = modele3DPour(boutique.template_key);
  const version = boutique.template_version ?? modele?.versionParDefaut ?? 1;

  useEffect(() => {
    const suivre = () => setPleinEcran(document.fullscreenElement === cadre.current);
    document.addEventListener('fullscreenchange', suivre);
    return () => document.removeEventListener('fullscreenchange', suivre);
  }, []);

  const basculerPleinEcran = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void cadre.current?.requestFullscreen?.();
  };

  if (!modele) {
    return (
      <div className="space-y-4">
        <BarreTitre boutique={boutique} onFermer={onFermer} t={t} />
        <p
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}
        >
          Cette boutique n’utilise aucun modèle 3D connu
          {boutique.template_key ? ` (${boutique.template_key})` : ''}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BarreTitre boutique={boutique} onFermer={onFermer} t={t}>
        <button
          type="button"
          onClick={basculerPleinEcran}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
        >
          {pleinEcran ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          {pleinEcran ? 'Quitter le plein écran' : 'Plein écran'}
        </button>
      </BarreTitre>

      {/* LE CADRE. `key` sur l'identite : passer d'une boutique a l'autre remonte le moteur au
          lieu de lui faire changer d'identite en cours de route — les quatre depots locaux et
          la ligne en base sont suffixes par elle. */}
      <div
        ref={cadre}
        className="boutique3d-cadre"
        style={{ height: HAUTEUR, background: '#08070a', border: `1px solid ${t.card.border}` }}
      >
        <Boutique3D
          key={boutique.id}
          boutiqueId={boutique.id}
          baseAssets={modele.baseAssets(version)}
          acces={acces}
        />
      </div>
    </div>
  );
}

function BarreTitre({
  boutique, onFermer, t, children,
}: {
  boutique: Boutique;
  onFermer: () => void;
  t: ReturnType<typeof useThemeTokens>;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onFermer}
          aria-label="Revenir à la liste des boutiques"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Boutiques
        </button>
        <div>
          <h2 className="text-xl font-bold" style={{ color: t.text.primary }}>{boutique.name}</h2>
          <p className="text-xs mt-0.5" style={{ color: t.input.placeholder }}>
            {modele3DPour(boutique.template_key)?.nom ?? 'Modèle inconnu'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
