import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ArrowUpDown, Mail, Building2, Eye, EyeOff } from 'lucide-react';
import PremiumActionCard from './PremiumActionCard';
import type { ActionDef } from '../ActionModal';
import type { ThemeTokens } from '../../../lib/themeTokensTypes';

export interface PremiumIdentity {
  name: string;
  email: string;
  /**
   * Ligne secondaire, entierement decrite par l appelant :
   * « Société : IKEA », « Groupe : Willness », « Tél : 06… »…
   */
  detail?: { label: string; value: string; icon?: React.ReactNode };
}

interface Props {
  /** Titre visible. Aucun role technique ne transite par ici. */
  title: string;
  identity: PremiumIdentity;
  /** Titre de la section. « Gestion » par defaut. */
  sectionLabel?: string;
  actions: ActionDef[];
  t: ThemeTokens;
  onClose: () => void;
  /** Preference UX du Groupe : l'ordre. Toujours disponible. */
  reorder: {
    active: boolean;
    onStart: () => void;
    onCancel: () => void;
    onConfirm: () => void;
    onMove: (from: number, to: number) => void;
  };
  /**
   * Controle fonctionnel de Talvex : quels boutons existent pour ce Groupe.
   * ABSENT quand le Groupe est connecte normalement — le bouton « Masquer »
   * n'est alors meme pas rendu.
   */
  visibility?: {
    active: boolean;
    hiddenCount: number;
    onStart: () => void;
    onCancel: () => void;
    onConfirm: () => void;
    onHide: (id: string) => void;
    onOpenHiddenList: () => void;
  };
}

/**
 * Modale « Actions societe » du panel Groupe.
 *
 * Habillage UNIQUEMENT. Elle recoit des actions deja ordonnees et se contente
 * de les peindre : elle n'invente aucun ordre, ne stocke rien et n'appelle
 * jamais Supabase. Les `onClick` metier lui sont opaques.
 *
 * Dediee a ce panel : la modale partagee `ActionModal`, utilisee par six autres
 * ecrans, reste strictement inchangee.
 */
export default function PremiumActionsModal({ title, identity, sectionLabel = 'Gestion', actions, t, onClose, reorder, visibility }: Props) {
  const m = t.modal;
  const dragFrom = useRef<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const initial = (identity.name || identity.detail?.value || '?').trim().charAt(0).toUpperCase();
  const hiding = visibility?.active === true;
  // Les deux modes sont exclusifs : on n'ordonne pas pendant qu'on masque.
  const oneColumn = reorder.active || hiding;
  // Nombre impair : la derniere carte occupe toute la largeur plutot que de
  // rester seule dans une demi-colonne.
  const lastWide = actions.length % 2 === 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: m.overlayBg, backdropFilter: 'blur(10px)' }}
    >
      <div
        className="rounded-2xl w-full max-w-[400px] relative overflow-hidden"
        style={{
          background: m.bg,
          border: `1px solid ${m.border}`,
          boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        {/* HEADER — compact, separation en cheveu */}
        <div
          className="flex items-center justify-between gap-3 pl-5 pr-3 py-3"
          style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}
        >
          <h2 className="text-[13px] font-semibold tracking-tight" style={{ color: t.text.primary }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ color: t.text.quaternary }}
            onMouseEnter={e => { e.currentTarget.style.background = t.surface.hover; e.currentTarget.style.color = t.text.primary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.text.quaternary; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* IDENTITE — carte, lisible en deux secondes */}
          <div
            className="flex items-center gap-3 rounded-xl px-3.5 py-3"
            style={{
              background: `linear-gradient(140deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
              border: `1px solid ${t.surface.borderLight}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
            }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-bold text-white flex-shrink-0"
              style={{
                background: `linear-gradient(140deg, ${t.accent.text}, ${t.accent.text}b3)`,
                boxShadow: `0 4px 14px -4px ${t.accent.text}80`,
              }}
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: t.text.primary }}>
                {identity.name || '—'}
              </p>
              {identity.detail?.value && (
                <p className="flex items-center gap-1.5 text-[11px] leading-tight mt-1 truncate" style={{ color: t.accent.text }}>
                  <span className="w-3 h-3 flex-shrink-0 flex items-center justify-center">
                    {identity.detail.icon ?? <Building2 className="w-3 h-3" />}
                  </span>
                  <span className="truncate">{identity.detail.label} : {identity.detail.value}</span>
                </p>
              )}
              {identity.email && (
                <p className="flex items-center gap-1.5 text-[10.5px] leading-tight mt-0.5 truncate" style={{ color: t.text.quaternary }}>
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{identity.email}</span>
                </p>
              )}
            </div>
          </div>

          {/* SECTION — le controle vit dans le titre : present, mais secondaire */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase flex-shrink-0" style={{ color: t.text.quaternary }}>
                {sectionLabel}
              </span>
              <span className="h-px flex-1" style={{ background: t.surface.borderLight }} />
              {reorder.active || hiding ? (
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <Pill
                    onClick={hiding ? visibility!.onConfirm : reorder.onConfirm}
                    tone="#34d399" icon={<Check className="w-3 h-3" />} label="Valider"
                  />
                  <Pill
                    onClick={hiding ? visibility!.onCancel : reorder.onCancel}
                    tone="#f87171" icon={<X className="w-3 h-3" />} label="Annuler"
                  />
                </span>
              ) : (
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <Pill onClick={reorder.onStart} tone={t.text.quaternary} icon={<ArrowUpDown className="w-3 h-3" />} label="Réorganiser" />
                  {/* Rendu UNIQUEMENT quand Talvex visualise ce Groupe. */}
                  {visibility && (
                    <Pill onClick={visibility.onStart} tone={t.text.quaternary} icon={<EyeOff className="w-3 h-3" />} label="Masquer" />
                  )}
                </span>
              )}
            </div>

            {reorder.active && (
              <p className="text-[10px] leading-tight" style={{ color: t.text.quaternary }}>
                Glissez les cartes, ou utilisez les flèches.
              </p>
            )}

            {hiding && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] leading-tight" style={{ color: t.text.quaternary }}>
                  Masquer retire le bouton pour cette société. Le code reste intact.
                </p>
                <button
                  onClick={visibility!.onOpenHiddenList}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold flex-shrink-0 transition-all active:scale-[0.97]"
                  style={{ background: `${t.accent.text}14`, border: `1px solid ${t.accent.text}2e`, color: t.accent.text }}
                >
                  <Eye className="w-3 h-3" />Boutons masqués
                  {visibility!.hiddenCount > 0 && ` (${visibility!.hiddenCount})`}
                </button>
              </div>
            )}

            {/* Affichage : grille 2 colonnes sur desktop.
                Reorganisation : une seule colonne — les poignees ont la place,
                et « monter / descendre » n'a plus aucune ambiguite. */}
            <div className={`grid gap-2 ${oneColumn ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {actions.map((action, i) => (
                <PremiumActionCard
                  key={action.id}
                  action={action}
                  t={t}
                  wide={!oneColumn && lastWide && i === actions.length - 1}
                  hiding={hiding}
                  onHide={() => visibility?.onHide(action.id)}
                  reordering={reorder.active}
                  index={i}
                  total={actions.length}
                  onMoveUp={() => reorder.onMove(i, i - 1)}
                  onMoveDown={() => reorder.onMove(i, i + 1)}
                  onDragStart={() => { dragFrom.current = i; setDropAt(null); }}
                  onDragOver={e => {
                    if (dragFrom.current === null || dragFrom.current === i) return;
                    e.preventDefault();
                    setDropAt(i);
                  }}
                  onDrop={() => {
                    if (dragFrom.current !== null && dropAt !== null) reorder.onMove(dragFrom.current, dropAt);
                    dragFrom.current = null;
                    setDropAt(null);
                  }}
                  dragging={dragFrom.current === i}
                  dropTarget={dropAt === i}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Petite pastille de commande : visible, jamais un CTA principal. */
function Pill({ onClick, tone, icon, label }: { onClick: () => void; tone: string; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold flex-shrink-0 transition-all active:scale-[0.97]"
      style={{ background: `${tone}14`, border: `1px solid ${tone}2e`, color: tone }}
      onMouseEnter={e => { e.currentTarget.style.background = `${tone}24`; e.currentTarget.style.borderColor = `${tone}4d`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${tone}14`; e.currentTarget.style.borderColor = `${tone}2e`; }}
    >
      {icon}{label}
    </button>
  );
}
