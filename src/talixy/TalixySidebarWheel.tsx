import { useCallback, useMemo, type ReactNode } from 'react';
import { useArcMetrics, useMediaQuery } from './useArcMetrics';
import { TALIXY_ARC_QUERY } from './useTalixySidebar';
import { entryLabel, type LayoutEntry, type LayoutItem } from '../lib/sidebarLayout';
import { presetNameFor } from './arcGeometry';
import {
  TALIXY_ARC2_PRESETS, TALIXY_ARC_MODE, TALIXY_BREAKPOINTS, TALIXY_PLANET,
  TALIXY_SIDEBAR_LAYOUT, TALIXY_WHEEL_PRESETS,
} from './talixyConfig';
import TalixyArc, { type ArcHub, type ArcItem } from './TalixyArc';

/*
 * TALIXY — adaptateur « sidebar -> arc ».
 * Recoit EXACTEMENT les entrees deja affichees par le moteur de sidebar (ordre, masquage, droits, Visu
 * inchanges) et les pose sur la jante. Chaque onglet est rendu par le meme composant qu'aujourd'hui
 * (renderItem : clic, navigation, badges, couleurs de l'editeur, identifiants de test).
 *
 * Mode « fixed » (maquette gris bleute) : les compartiments deviennent des RESPIRATIONS sur l'arc
 * (la maquette ne montre aucun titre) — le titre reste annonce aux lecteurs d'ecran ; les points
 * lumineux decoratifs de la ligne sont dessines par TalixyArcLine. Le decor est centre sur le moyeu
 * grace aux variables --tx-* publiees sur l'hote [data-tx-scene] / [data-tx-planet-host].
 */
interface Props {
  rows: { entry: LayoutEntry }[];
  activeId: string;
  collapsed: boolean;
  defaultLabels: Record<string, string>;
  renderItem: (entry: LayoutItem, isActive: boolean, label: string) => ReactNode;
  sectionColorById?: Record<string, string>;
  sectionFontFamily?: string;
}



export default function TalixySidebarWheel({
  rows, activeId, collapsed, defaultLabels, renderItem, sectionColorById, sectionFontFamily,
}: Props) {
  const fluide = useArcMetrics();
  const width = fluide.viewport.w;
  // Maquette : partout au-dessus du mobile (768 px), jamais en mode reduit ni en colonne reduite.
  // MEME seuil que la colonne et que le CSS : la media query, jamais innerWidth (voir
  // TALIXY_ARC_QUERY dans useTalixySidebar).
  const large = useMediaQuery(TALIXY_ARC_QUERY);
  const arc2 = TALIXY_ARC_MODE === 'fixed' && !collapsed && large;
  const preset = presetNameFor(width, collapsed, TALIXY_BREAKPOINTS);

  /*
   * GEOMETRIE FLUIDE. Les trois jeux desktop / laptop / compact ne sont plus choisis par un seuil :
   * ils sont devenus les points d'ancrage d'une courbe continue (src/talixy/arcFluid.ts). A 768,
   * 1024 et 1440 px on retombe exactement sur les valeurs validees ; entre deux, tout glisse ;
   * au-dela de 1440 px, plus rien ne grandit. L'ancienne roue (mode 'wheel') garde ses presets :
   * rien n'est retire, TALIXY_ARC2_LAYOUT reste la reference des trois ancres.
   */
  const params = arc2 ? { ...TALIXY_ARC2_PRESETS.desktop, spacing: fluide.spacing } : TALIXY_WHEEL_PRESETS[preset];
  const layout = arc2
    ? { padStart: fluide.padStart, padEnd: fluide.padEnd, focus: fluide.focus, lineGap: fluide.lineGap }
    : TALIXY_SIDEBAR_LAYOUT[preset];

  const publishHub = useCallback(({ x, y, radius, ms, turnDeg, element }: ArcHub) => {
    const host = element.closest<HTMLElement>('[data-tx-scene], [data-tx-planet-host]');
    if (!host) return;
    const a = host.getBoundingClientRect();
    const r = element.getBoundingClientRect();
    const hx = r.left - a.left + x;
    const hy = r.top - a.top + y;
    const set = (k: string, v: string) => host.style.setProperty(k, v);
    set('--tx-hub-x', `${hx.toFixed(1)}px`);
    set('--tx-hub-y', `${hy.toFixed(1)}px`);
    set('--tx-hub-r', `${radius.toFixed(1)}px`);
    set('--tx-hub-ms', `${ms}ms`);
    if (arc2) {
      // Ligne d'arc de la maquette : cercle concentrique, 51 px A GAUCHE des disques (rayon + ecart).
      const gap = (layout as { lineGap?: number }).lineGap ?? 51;
      set('--tx-line-r', `${(radius + gap).toFixed(1)}px`);
    } else {
      set('--tx-planet-r', `${Math.max(0, a.width - TALIXY_PLANET.rimGap - hx).toFixed(1)}px`);
      set('--tx-hub-turn', `${(turnDeg * TALIXY_PLANET.orbitShare).toFixed(2)}deg`);
    }
  }, [arc2, layout]);

  const items = useMemo<ArcItem[]>(() => rows.map(({ entry }) => {
    if (entry.kind === 'item') {
      return { key: entry.id, kind: 'item', render: active => renderItem(entry, active, entryLabel(entry, defaultLabels)) };
    }
    if (entry.kind === 'section') {
      return {
        key: entry.id,
        kind: 'section',
        label: entry.label,
        render: () => (collapsed ? null : arc2 ? (
          // Maquette : aucun titre visible — le compartiment devient une respiration sur l'arc,
          // annoncee aux lecteurs d'ecran. Rien n'est retire des configurations enregistrees.
          <span className="sr-only">{entry.label}</span>
        ) : (
          <p className="tx-arc-section" style={{
            color: sectionColorById?.[entry.id] || undefined,
            fontFamily: sectionFontFamily ? `"${sectionFontFamily}", sans-serif` : undefined,
          }}>{entry.label}</p>
        )),
      };
    }
    return { key: entry.id, kind: 'divider', render: () => (arc2 ? null : <span aria-hidden className="tx-arc-divider" />) };
  }), [rows, collapsed, arc2, defaultLabels, renderItem, sectionColorById, sectionFontFamily]);

  const activeIndex = items.findIndex(i => i.kind === 'item' && i.key === activeId);

  return (
    <TalixyArc
      items={items}
      activeIndex={activeIndex}
      params={params}
      orientation="vertical"
      mode={arc2 ? 'fixed' : 'wheel'}
      focus={layout.focus}
      padStart={layout.padStart}
      padEnd={layout.padEnd}
      disc={arc2 ? fluide.disc : 0}
      lineGap={arc2 ? ((layout as { lineGap?: number }).lineGap ?? 0) : 0}
      className={collapsed ? 'tx-arc-compact' : undefined}
      /*
       * Le disque suit lui aussi la courbe. Il valait 44 px, ou 38 px sous 1024 px par la classe
       * tx-size-compact : deux valeurs, un saut. Publie ici en variable, il varie en continu.
       * La zone cliquable, elle, ne bouge pas : c'est la case entiere (talixy.css).
       */
      style={arc2 ? ({
        '--tx-disc': `${fluide.disc}px`,
        '--tx-disc-cx': `${(fluide.disc / 2).toFixed(1)}px`,
        '--tx-arc-label': `${(11 + fluide.disc / 22).toFixed(2)}px`,
      } as React.CSSProperties) : undefined}
      onHub={publishHub}
    />
  );
}
