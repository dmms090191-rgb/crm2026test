/*
 * L'IDENTIFIANT DE CONVERSATION D'UN LEAD — UNE SEULE REGLE.
 *
 * La conversation d'un lead (table client_messages, colonne client_auth_id) est designee par
 * l'id du lead, et par rien d'autre.
 *
 * ---------- CE QUI A ETE RETIRE LE 19/11/2026 (lot L0), ET POURQUOI ----------
 *
 * Treize lectures de l'interface calculaient cet identifiant par la cascade
 *     lead.data['AuthId'] ?? lead.data['auth_id'] ?? lead.id
 * et le declencheur trg_propagate_lead_vendor_id faisait de meme en base, en SECURITY DEFINER,
 * sans filtre de societe. Or `data` est rempli par l'import CSV (la ligne entiere du fichier) et
 * modifiable par l'API. Une colonne « AuthId » dans un fichier suffisait donc a :
 *   - designer la conversation d'une AUTRE societe, ou le declencheur reecrivait le commercial ;
 *   - bloquer toute reaffectation du lead : une cellule vide fait echouer la conversion en uuid ;
 *   - detourner la messagerie de l'admin et du commercial, et le destinataire des notifications ;
 *   - faire passer la vraie conversation pour orpheline dans le nettoyage de la sauvegarde.
 *
 * Mesure du 19/11/2026 (role postgres, hors RLS) : 0 lead sur 110 portait la cle, et pour 110
 * sur 110 la cascade rendait deja lead.id. Retirer la cascade ne change l'identifiant d'AUCUN
 * lead existant : cela retire seulement la porte.
 *
 * La base ne fait plus confiance a ces cles non plus (migration L0) : le declencheur ne lit plus
 * `data`, et un second declencheur renomme AuthId / auth_id en « CSV · AuthId » / « CSV · auth_id »
 * a l'ecriture. Ce second verrou protege aussi les applications Windows et Android deja
 * installees, qui embarquent l'ancienne cascade et ne se mettent pas a jour a distance.
 *
 * Limite connue, hors de ce lot : la messagerie du CLIENT sur telephone (PwaMobileShell) designe
 * sa conversation par l'id de son compte, qu'aucun lead ne relie. Elle ne fonctionnait pas avant
 * L0 et ne fonctionne pas apres ; elle sera traitee avec le mobile.
 *
 * Ne JAMAIS reintroduire une lecture de `data` pour designer une conversation, un destinataire ou
 * une identite : le releve scripts/securite/l0AuthId.test.ts l'interdit.
 */
export function idConversationLead(lead: { id: string }): string {
  return lead.id;
}
