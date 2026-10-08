import { ArrowLeft, Box, Briefcase } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { aUnCabinet3D, cabinetTemplateLabel, formatCabinetDate } from './cabinetTypes';
import type { Cabinet } from './cabinetTypes';

interface Props {
  cabinet: Cabinet;
  onFermer: () => void;
}

/**
 * L'ESPACE D'UN CABINET OUVERT.
 *
 * Comme dans le module Boutique, ouvrir ne change pas d'onglet : l'espace REMPLACE la liste
 * dans la meme page. Deux surfaces de cette taille se disputeraient le defilement, et la
 * scene 3D y perdrait sa hauteur (voir le commentaire de Boutiques.tsx).
 *
 * ---------- LE POINT D'INSERTION DE LA 3D ----------
 *
 * Aujourd'hui, aucun modele de cabinet n'a de scene : `MODELES_CABINET_3D` est vide, donc
 * `aUnCabinet3D` rend faux pour tous les cabinets, et le bloc ci-dessous l'annonce
 * franchement plutot que de faire croire a une scene absente.
 *
 * Quand le modele Blender existera, deux choses se passeront ici, et seulement ici :
 *   1. le modele se declare dans `MODELES_CABINET_3D` (cabinetTypes.ts) ;
 *   2. la branche « scene declaree » cede la place au pont 3D, charge par `lazy()`.
 *
 * La frontiere `lazy()` n'est pas un confort : moteur + three.js + styles pesent environ
 * 1,2 Mo, aucun `manualChunks` n'est declare dans ce projet, et un import statique les
 * ferait entrer dans le paquet d'entree servi au tableau de bord, au CRM et au chat — sans
 * qu'aucune erreur ne le signale. Elle ne se verrait qu'a la taille du paquet.
 */
export default function CabinetOuvert({ cabinet, onFermer }: Props) {
  const t = useThemeTokens();
  const sceneDeclaree = aUnCabinet3D(cabinet.template_key);

  const fiche = [
    { label: 'Modèle', value: cabinetTemplateLabel(cabinet.template_key) },
    { label: 'Créé le', value: formatCabinetDate(cabinet.created_at) },
    { label: 'Statut', value: cabinet.status === 'active' ? 'Actif' : cabinet.status },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={onFermer}
            data-testid="cabinet-retour"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Revenir aux cabinets
          </button>
          <h2 className="text-xl font-bold truncate" style={{ color: t.text.primary }}>{cabinet.name}</h2>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
          style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          <Briefcase className="w-5 h-5" />
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {fiche.map(f => (
          <div key={f.label} className="px-4 py-3 rounded-xl"
            style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}>
            <dt className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: t.label.muted }}>{f.label}</dt>
            <dd className="text-sm font-semibold mt-1 truncate" style={{ color: t.text.secondary }}>{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 rounded-xl text-center"
        data-testid="cabinet-scene-3d"
        style={{ background: t.card.bg, border: `1px dashed ${t.card.border}` }}>
        <Box className="w-9 h-9" style={{ color: t.text.quaternary }} />
        {sceneDeclaree ? (
          <>
            <p className="text-sm font-semibold" style={{ color: t.text.secondary }}>
              Scène 3D déclarée pour ce modèle
            </p>
            <p className="text-xs max-w-md leading-relaxed" style={{ color: t.text.tertiary }}>
              Le modèle de ce cabinet est enregistré, son affichage se branche à cet emplacement.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold" style={{ color: t.text.secondary }}>
              Aucune scène 3D n’est encore installée pour ce cabinet
            </p>
            <p className="text-xs max-w-md leading-relaxed" style={{ color: t.text.tertiary }}>
              Le cabinet existe, il est enregistré et retrouvable. Sa scène apparaîtra ici dès que
              son modèle 3D sera conçu.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
