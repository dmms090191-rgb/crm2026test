import { useSyncExternalStore } from 'react';

/**
 * « MONTRER CE LEAD » — une demande du tableau de bord au CRM.
 *
 * Au retour du chat, d'une connexion en tant que client ou d'un rendez-vous, le tableau de
 * bord cherche la ligne `[data-row-id="<lead>"]` pour y defiler et la surligner. Depuis que
 * le CRM ne monte ses leads que PAR TRANCHES (200, puis 200...) et qu'il n'affiche que ceux
 * de l'onglet ouvert, cette ligne peut ne pas exister dans la page : le retour ne menait plus
 * nulle part (defaut releve a la relecture du 19/11).
 *
 * Le tableau de bord DEMANDE donc le lead avant de le chercher ; le CRM, des que ses leads
 * sont charges, monte la tranche qui le contient — ou rouvre Principal si l'onglet ouvert ne
 * le contient pas — puis marque la demande comme servie.
 */

let demande: string | null = null;
let minuterie: ReturnType<typeof setTimeout> | null = null;
const abonnes = new Set<() => void>();
/** Au-dela, une demande non servie est oubliee : elle ne doit pas ressurgir a l'ouverture
    suivante du CRM (et y basculer l'onglet sur Principal sans qu'on l'ait demande). */
const DUREE_DEMANDE_MS = 20_000;

const oublier = () => {
  if (minuterie) { clearTimeout(minuterie); minuterie = null; }
  demande = null;
  abonnes.forEach(f => f());
};

export function demanderLeadVisible(leadId: string | null | undefined) {
  if (!leadId) return;
  if (minuterie) clearTimeout(minuterie);
  demande = leadId;
  minuterie = setTimeout(oublier, DUREE_DEMANDE_MS);
  abonnes.forEach(f => f());
}

/** La demande est servie (ou impossible a servir) : on l'oublie. */
export function leadMontre(leadId: string) {
  if (demande !== leadId) return;
  oublier();
}

/**
 * Le CRM fait lui-meme defiler jusqu'au lead et le surligne, une fois sa ligne montee : il
 * ne depend plus du delai du tableau de bord, que la lecture de milliers de leads peut
 * depasser (et que le retour d'une connexion client annulait avant meme qu'il demarre).
 */
export function defilerVersLead(leadId: string) {
  let essais = 0;
  const chercher = () => {
    const el = document.querySelector(`[data-row-id="${CSS.escape(leadId)}"]`);
    if (!el) { if (++essais < 60) requestAnimationFrame(chercher); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('scroll-highlight');
    setTimeout(() => el.classList.remove('scroll-highlight'), 2000);
  };
  requestAnimationFrame(chercher);
}

const sabonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };
const lire = () => demande;

export function useLeadDemande(): string | null {
  return useSyncExternalStore(sabonner, lire, lire);
}
