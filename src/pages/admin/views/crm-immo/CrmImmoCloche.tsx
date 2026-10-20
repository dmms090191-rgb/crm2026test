import { useState, useRef, useEffect } from 'react';
import { Bell, CalendarClock, Coins, Check, CheckCheck, X, RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { formatDateImmo } from './crmImmoTypes';
import type { Alerte, FiltreAlertes } from '../../../../lib/crmImmoAlertes';

/**
 * LA CLOCHE DEDIEE A CRM IMMO.
 *
 * Elle vit dans le dossier du module, et PAS dans components/topbar/ ni dans
 * components/notifications/. Ce n'est pas un rangement arbitraire : les deux systemes ne
 * doivent jamais se croiser, dans aucun des deux sens. Elle n'affiche que des fins de
 * contrat et des loyers CRM Immo, et son chiffre n'entre dans aucune somme generale.
 *
 * L'accident le plus naturel serait de reutiliser NotifHubShell « pour garder le
 * design » : son rendu fait un reduce sur les cartes qu'on lui passe, donc fusionner les
 * deux listes fondrait les deux compteurs en un seul chiffre, sans erreur et sans
 * difference visible. D'ou ce composant, autonome, et le test qui interdit le melange.
 *
 * Trois filtres, exactement comme David les a tranches : Actives / Traitées / Toutes.
 * Traité retire l'alerte des actives ET du badge, mais ne la supprime pas.
 */

interface Props {
  alertes: Alerte[];
  badge: number;
  filtre: FiltreAlertes;
  onFiltre: (f: FiltreAlertes) => void;
  chargement: boolean;
  erreur: string;
  onRecharger: () => void;
  onMarquerLue: (a: Alerte) => void;
  onMarquerTraitee: (a: Alerte) => void;
  onOuvrirDossier: (dossierId: string) => void;
}

const FILTRES: { valeur: FiltreAlertes; libelle: string }[] = [
  { valeur: 'actives', libelle: 'Actives' },
  { valeur: 'traitees', libelle: 'Traitées' },
  { valeur: 'toutes', libelle: 'Toutes' },
];

export default function CrmImmoCloche({
  alertes, badge, filtre, onFiltre, chargement, erreur,
  onRecharger, onMarquerLue, onMarquerTraitee, onOuvrirDossier,
}: Props) {
  const t = useThemeTokens();
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement | null>(null);

  /* Fermeture au clic dehors et a Echap : un panneau qui reste ouvert derriere une
     modale est le genre de detail qui fait passer un outil pour un brouillon. */
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    document.addEventListener('mousedown', dehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('mousedown', dehors);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  /* On recharge a l'OUVERTURE du panneau : c'est le moment ou l'on vient regarder. */
  function basculer() {
    const suivant = !ouvert;
    setOuvert(suivant);
    if (suivant) onRecharger();
  }

  function phrase(a: Alerte): string {
    if (a.genre === 'fin_contrat') {
      return `Le contrat du locataire ${a.locataire} avec le propriétaire ${a.proprietaire} arrive à échéance le ${formatDateImmo(a.echeance)}.`;
    }
    return `Loyer à encaisser — ${a.locataire} — pour ${a.proprietaire} — échéance le ${formatDateImmo(a.echeance)}.`;
  }

  function urgence(a: Alerte): string {
    if (a.joursRestants < 0) return `en retard de ${Math.abs(a.joursRestants)} j`;
    if (a.joursRestants === 0) return "aujourd'hui";
    return `dans ${a.joursRestants} j`;
  }

  return (
    <div className="relative" ref={zone} data-testid="crm-immo-cloche">
      <button type="button" onClick={basculer}
        title="Alertes CRM Immo"
        /*
         * Le mot << Alertes >> est en hidden sm:inline : sous 640 px ce bouton n est
         * qu une cloche dessinee. Le libelle porte donc aussi le COMPTE, qui n est
         * visible que sous forme de pastille coloree.
         */
        aria-label={badge > 0
          ? `Alertes CRM Immo, ${badge} non ${badge > 1 ? 'lues' : 'lue'}`
          : 'Alertes CRM Immo'}
        aria-expanded={ouvert}
        data-testid="crm-immo-cloche-bouton"
        className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Alertes</span>
        {badge > 0 && (
          <span
            data-testid="crm-immo-cloche-badge"
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center"
            style={{ background: t.danger.text, color: t.text.inverse }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {ouvert && (
        <div
          data-testid="crm-immo-cloche-panneau"
          className="absolute right-0 mt-2 w-[min(92vw,26rem)] max-h-[70dvh] flex flex-col rounded-xl overflow-hidden z-40"
          style={{ background: t.dropdown.bg, border: `1px solid ${t.dropdown.border}`, boxShadow: t.dropdown.shadow }}>

          <div className="flex items-center justify-between px-3 py-2.5 shrink-0"
            style={{ borderBottom: `1px solid ${t.dropdown.border}` }}>
            <h3 className="text-sm font-bold" style={{ color: t.heading.primary }}>Alertes CRM Immo</h3>
            <div className="flex items-center gap-1">
              <button type="button" onClick={onRecharger} title="Actualiser"
                aria-label="Actualiser les alertes"
                data-testid="crm-immo-cloche-actualiser"
                /* Mesure a 375 px : 26 x 26, et ce bouton touche celui de fermeture a
                   4 px. Deux ::before voisins se chevaucheraient : on agrandit donc les
                   boutons eux-memes. 15 px autour d une icone de 14 donnent 44 x 44. */
                className="p-1.5 max-md:p-[15px] rounded-lg" style={{ color: t.label.muted }}>
                <RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={() => setOuvert(false)} title="Fermer"
                aria-label="Fermer les alertes"
                data-testid="crm-immo-cloche-fermer"
                className="p-1.5 max-md:p-[15px] rounded-lg" style={{ color: t.label.muted }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 shrink-0" style={{ borderBottom: `1px solid ${t.dropdown.border}` }}>
            {FILTRES.map(f => {
              const actif = filtre === f.valeur;
              return (
                <button key={f.valeur} type="button" onClick={() => onFiltre(f.valeur)}
                  data-testid={`crm-immo-cloche-filtre-${f.valeur}`}
                  /* Mesure a 375 px : 24 px de haut. 14 px de rembourrage vertical
                     portent la pastille a 44 sans toucher a sa largeur ni a son texte. */
                  className="px-2.5 py-1 max-md:py-[14px] rounded-full text-xs font-semibold"
                  style={actif
                    ? { background: t.accent.solid, color: t.text.inverse }
                    : { background: t.surface.secondary, color: t.text.secondary }}>
                  {f.libelle}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {erreur !== '' && (
              <p className="text-xs m-3 px-3 py-2 rounded-lg"
                style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
                {erreur}
              </p>
            )}
            {alertes.length === 0 && (
              <p className="text-sm px-3 py-8 text-center" style={{ color: t.label.muted }}
                data-testid="crm-immo-cloche-vide">
                {filtre === 'actives' ? 'Aucune alerte active.' : filtre === 'traitees' ? 'Aucune alerte traitée.' : 'Aucune alerte.'}
              </p>
            )}

            {alertes.map(a => (
              <div key={`${a.dossier_id}|${a.genre}|${a.periode}`}
                data-testid={`crm-immo-alerte-${a.genre}-${a.dossier_id}`}
                className="px-3 py-2.5"
                style={{
                  borderBottom: `1px solid ${t.dropdown.border}`,
                  background: a.lue || a.traitee ? 'transparent' : t.surface.selected,
                }}>
                <div className="flex items-start gap-2">
                  {a.genre === 'fin_contrat'
                    ? <CalendarClock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: t.warning.text }} />
                    : <Coins className="w-4 h-4 mt-0.5 shrink-0" style={{ color: t.accent.text }} />}
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => { onOuvrirDossier(a.dossier_id); setOuvert(false); }}
                      data-testid={`crm-immo-alerte-ouvrir-${a.dossier_id}`}
                      /* break-words : locataire et proprietaire sont saisis a la main.
                         Un jeton insecable long serait coupe par l overflow-hidden du
                         panneau, sans jamais declencher de barre de defilement. */
                      className="text-left text-sm leading-snug hover:underline break-words"
                      style={{ color: t.text.primary }}>
                      {phrase(a)}
                    </button>
                    {/*
                      Mesure a 375 px : << marquer lue >> faisait 75 x 17 et << traiter >>
                      45 x 17. Dix-sept pixels de haut, c est une cible de souris.

                      Le rembourrage vertical les porte a 45. Il faut alors ECARTER cette
                      rangee de la phrase au-dessus : sans le mt-3, la zone agrandie
                      mordrait de 8 px sur le bouton qui ouvre le dossier, et toucher la
                      derniere ligne de la phrase marquerait l alerte lue.
                    */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 max-md:mt-3">
                      <span className="text-[11px]" style={{ color: a.joursRestants < 0 ? t.danger.text : t.label.hint }}>
                        {urgence(a)}
                      </span>
                      {a.traitee ? (
                        <span className="text-[11px] inline-flex items-center gap-1" style={{ color: t.success.text }}>
                          <CheckCheck className="w-3 h-3" /> traitée
                        </span>
                      ) : (
                        <>
                          {!a.lue && (
                            <button type="button" onClick={() => onMarquerLue(a)}
                              data-testid={`crm-immo-alerte-lue-${a.dossier_id}`}
                              className="text-[11px] inline-flex items-center gap-1 hover:underline max-md:py-3.5"
                              style={{ color: t.text.link }}>
                              <Check className="w-3 h-3" /> marquer lue
                            </button>
                          )}
                          <button type="button" onClick={() => onMarquerTraitee(a)}
                            data-testid={`crm-immo-alerte-traitee-${a.dossier_id}`}
                            className="text-[11px] inline-flex items-center gap-1 hover:underline max-md:py-3.5"
                            style={{ color: t.success.text }}>
                            <CheckCheck className="w-3 h-3" /> traiter
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
