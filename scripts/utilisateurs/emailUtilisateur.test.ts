/**
 * LES DEUX CHEMINS D'ECRITURE D'UN EMAIL D'UTILISATEUR.
 * Lancer :  npx tsx scripts/utilisateurs/emailUtilisateur.test.ts
 *
 * ---------- CE QUE CE FICHIER TIENT ----------
 *
 * Deux defauts rapportes le 23 octobre 2026 par David, et prouves avant correction :
 *
 *   BUG 1 — Societe > Acces & securite > Info Admin : l'email saisi ne devenait pas
 *   celui de la connexion, sans aucune erreur. Trois causes cumulees : l'ecriture
 *   passait par `supabase.auth.updateUser({ email })`, qui enregistre une DEMANDE et
 *   attend une confirmation par courriel ; le succes etait annonce sur le seul critere
 *   `error === null` ; et en mode Visu l'email n'etait envoye a AUCUNE fonction.
 *   Releve en base : deux comptes portaient un `email_change` en attente, dont un
 *   depuis le 21 octobre, avec les DEUX jetons de confirmation poses.
 *
 *   BUG 2 — Talvex > Liste des groupes > Details : « Error updating user ». Le journal
 *   Auth disait la cause exacte : violation de `users_email_partial_key` (SQLSTATE
 *   23505), c'est-a-dire un email deja pris. Le message brut etait relaye verbatim, et
 *   l'identite partait dans le MEME appel que l'email — donc un conflit d'email faisait
 *   aussi echouer le prenom, le nom et le telephone.
 *
 * ---------- LE PIEGE DE LA PROSE ----------
 *
 * Les fichiers de ce depot expliquent en commentaire ce qu'ils s'interdisent. Un grep
 * naif y trouve donc le motif qu'il cherche a interdire, et passe au vert pour la plus
 * mauvaise des raisons. Tout ce qui est lu ici passe par `sansCommentaires`.
 */
import { readFileSync } from 'node:fs';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const lire = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const SECTION = sansCommentaires(lire('src/pages/admin/views/info-admin/InfoAdminPasswordSection.tsx'));
const ECRAN = sansCommentaires(lire('src/pages/admin/views/InfoAdmin.tsx'));
const ONGLET = sansCommentaires(lire('src/components/detail/EntityInfoTab.tsx'));
const FN_SOCIETE = sansCommentaires(lire('supabase/functions/update-admin-for-super-admin/index.ts'));
const FN_GROUPE = sansCommentaires(lire('supabase/functions/update-company-super-admin/index.ts'));
const TZ = sansCommentaires(lire('src/contexts/TimezoneContext.tsx'));
const SHELL = sansCommentaires(lire('src/app/AppShell.tsx'));
const ROUTEUR = sansCommentaires(lire('src/app/AppDashboardRouter.tsx'));
const MON_COMPTE = sansCommentaires(lire('src/pages/superadmin/views/mon-compte/SAMonComptePasswordSection.tsx'));
const PARENT_MON_COMPTE = sansCommentaires(lire('src/pages/superadmin/views/SAMonCompte.tsx'));
const CSA = sansCommentaires(lire('src/pages/company-super-admin/CSAInfoPasswordSection.tsx'));

/** Le corps d'une fonction nommee, pour ne pas confondre deux handlers du meme fichier. */
function corpsDe(src: string, debut: string): string {
  const i = src.indexOf(debut);
  if (i < 0) return '';
  /* On s'arrete a la declaration suivante de meme niveau : `  const X = ` ou `  return (`. */
  const reste = src.slice(i + debut.length);
  /* ` {2}` et non deux espaces litteraux : le lint refuse les espaces comptes a l oeil,
     et il a raison — « deux ou trois espaces » ne se distinguent pas a la relecture. */
  const fin = reste.search(/\n {2}(const \w+ = |return \()/);
  return fin < 0 ? reste : reste.slice(0, fin);
}

const SAVE_EMAIL = corpsDe(SECTION, 'const saveEmail = async () => {');
const SAVE_PASSWORD = corpsDe(SECTION, 'const savePassword = async () => {');

console.log('\n=== 0. GARDE DU GARDE ===');
{
  for (const [nom, src] of [
    ['InfoAdminPasswordSection', SECTION], ['InfoAdmin', ECRAN], ['EntityInfoTab', ONGLET],
    ['update-admin-for-super-admin', FN_SOCIETE], ['update-company-super-admin', FN_GROUPE],
    ['TimezoneContext', TZ], ['AppShell', SHELL], ['AppDashboardRouter', ROUTEUR],
    ['SAMonComptePasswordSection', MON_COMPTE], ['SAMonCompte', PARENT_MON_COMPTE],
    ['CSAInfoPasswordSection', CSA],
  ] as [string, string][]) {
    t(`${nom} n est pas vide apres retrait des commentaires`, src.length > 500);
  }
  t('plus aucun bloc /* */ ne subsiste', !SECTION.includes('/*'));
  t('les deux handlers sont bien isoles l un de l autre',
    SAVE_EMAIL.length > 300 && SAVE_PASSWORD.length > 300
    && !SAVE_EMAIL.includes('savePassword') && !SAVE_PASSWORD.includes('saveEmail'));
}

console.log('\n=== 1. BUG 1 : L EMAIL PASSE PAR LE SERVEUR, PLUS PAR L API UTILISATEUR ===');
{
  /*
   * `auth.updateUser({ email })` enregistre une demande ; seule l API Admin pose
   * l email tout de suite, et elle n est joignable que depuis le serveur.
   */
  t('saveEmail appelle update-admin-for-super-admin',
    /update-admin-for-super-admin/.test(SAVE_EMAIL));
  t('saveEmail n appelle PAS auth.updateUser',
    !/auth\.updateUser/.test(SAVE_EMAIL));
  t('aucun appel a auth.updateUser ne porte un email dans tout le fichier',
    !/auth\.updateUser\([^)]*email/.test(SECTION));
  /* La cible : adminId vaut son propre compte en auto-service, le compte observe en
     Visu. Un seul chemin, donc plus de branche qui jette la saisie. */
  t('la cible envoyee est admin_id: adminId', /admin_id: adminId/.test(SAVE_EMAIL));
  t('aucune branche isImpersonating dans saveEmail', !/isImpersonating/.test(SAVE_EMAIL.replace(/if \(!isImpersonating\) await supabase\.auth\.refreshSession\(\);/, '')));
}

console.log('\n=== 2. BUG 1 : EMAIL ET MOT DE PASSE SONT SEPARES ===');
{
  t('le corps de l appel email ne contient PAS de mot de passe',
    !/password/.test(SAVE_EMAIL));
  t('le corps de l appel email ne contient PAS de pin',
    !/\bpin\b/.test(SAVE_EMAIL));
  t('l enregistrement du mot de passe ne porte PAS l email',
    !/\bemail\b/.test(SAVE_PASSWORD.replace(/update-user-password/g, '')));
  /* Deux boutons, donc deux gestes et deux messages : un echec de l un ne peut plus
     emporter l autre. */
  t('un bouton dedie a l email', /data-testid="info-admin-save-email-btn"/.test(SECTION));
  t('un bouton dedie au mot de passe', /data-testid="info-admin-save-credentials-btn"/.test(SECTION));
  t('deux etats d enregistrement distincts',
    /setSavingEmail/.test(SECTION) && /setSavingCred/.test(SECTION));
  t('deux messages distincts',
    /setEmailMsg/.test(SECTION) && /setCredMsg/.test(SECTION));
  /* Et le mot de passe n est plus pose sans condition : l ancienne version ecrivait
     `updates.password = pinStr` a chaque enregistrement, email compris. */
  t('plus aucun updates.password pose sans condition', !/updates\.password = pinStr/.test(SECTION));
}

console.log('\n=== 3. BUG 1 : PLUS AUCUNE CONFIRMATION VERTE NON VERIFIEE ===');
{
  /* Rien n a change -> on le DIT, et ce n est pas un succes. */
  t('un email inchange ne declenche aucune ecriture', /if \(!emailAChange\)/.test(SAVE_EMAIL));
  t('et il le dit au lieu d afficher un succes',
    /L.email n.a pas changé/.test(SECTION) && /type: 'info'/.test(SECTION));
  /* On ne croit pas l absence d erreur : on lit l email que le SERVEUR dit avoir pose. */
  t('la reponse du serveur est relue', /corps\.email/.test(SAVE_EMAIL));
  t('et comparee a ce qui etait demande',
    /normaliser\(applique\) !== normaliser\(vise\)/.test(SAVE_EMAIL));
  t('un serveur qui ne confirme pas rend une ERREUR, pas un succes',
    /n.a pas confirmé le nouvel email/.test(SECTION));
  /* Le jeton porte encore l ancien email apres l ecriture : sans refresh, toute
     lecture serveur partant du JWT verrait l ancienne adresse. */
  t('la session est rafraichie apres succes',
    /refreshSession\(\)/.test(SAVE_EMAIL));
  t('mais seulement pour son propre compte',
    /if \(!isImpersonating\) await supabase\.auth\.refreshSession\(\)/.test(SAVE_EMAIL));
  /* L email applique redescend a l ecran parent, sinon la prop le reecraserait. */
  t('l email applique est remonte au parent', /onEmailApplique\?\.\(applique\)/.test(SAVE_EMAIL));
  t('et l ecran parent le consomme', /onEmailApplique=\{setAdminEmail\}/.test(ECRAN));
}

console.log('\n=== 4. SECURITE : RIEN DE PRIVILEGIE DANS LE NAVIGATEUR ===');
{
  /*
   * Exigence de David, mot pour mot : aucune service_role dans le frontend, aucune
   * Admin API depuis le navigateur. On le verifie sur TOUT src/, pas seulement ici.
   */
  const SRC = sansCommentaires(
    ['src/pages/admin/views/info-admin/InfoAdminPasswordSection.tsx',
      'src/pages/admin/views/InfoAdmin.tsx',
      'src/components/detail/EntityInfoTab.tsx',
      'src/pages/superadmin/views/super-admins/SASuperAdminDetailModal.tsx',
      'src/pages/company-super-admin/CSAAdminDetailModal.tsx',
    ].map(lire).join('\n'),
  );
  t('aucune cle de service dans les fichiers du chantier',
    !/SERVICE_ROLE|service_role/i.test(SRC));
  t('aucun auth.admin.* dans les fichiers du chantier', !/auth\.admin\./.test(SRC));
  t('aucun createClient supplementaire', !/createClient\(/.test(SRC));
  /* Le jeton de l utilisateur, et lui seul, autorise l appel. */
  t('l appel email porte le jeton de la session',
    /Authorization: `Bearer \$\{session\.access_token\}`/.test(SAVE_EMAIL));

  /* Cote serveur : le role vient du jeton VERIFIE, jamais du corps de la requete. */
  for (const [nom, fn] of [['Societe', FN_SOCIETE], ['Groupe', FN_GROUPE]] as [string, string][]) {
    t(`${nom} : le role de l appelant est lu dans le jeton`,
      /callerRole = caller\.app_metadata\?\.role/.test(fn));
    t(`${nom} : le jeton est verifie par getUser`, /supabaseAuth\.auth\.getUser\(\)/.test(fn));
    t(`${nom} : ni role ni company_id ne sont lus dans le corps`,
      !/const \{[^}]*\brole\b[^}]*\} = await req\.json/.test(fn)
      && !/const \{[^}]*company_id[^}]*\} = await req\.json/.test(fn));
  }
}

console.log('\n=== 5. BUG 1 : L AUTO-SERVICE NE PEUT VISER QUE SOI-MEME ===');
{
  /*
   * C est la garde qui rend ce chemin acceptable : un Admin passe si et seulement si la
   * cible est son propre identifiant, lu dans le jeton verifie par le serveur.
   */
  t('la garde d auto-service existe', /const isSelfService =/.test(FN_SOCIETE));
  /*
   * Le point qui compte n est pas la liste des roles — la section 13 la verifie — mais
   * que la comparaison porte sur `caller.id`, c est-a-dire sur le jeton VERIFIE par le
   * serveur. Comparer a une valeur du corps rendrait la garde decorative.
   */
  t('et elle compare a caller.id, pas a une valeur du corps',
    /isSelfService =[\s\S]{0,120}admin_id === caller\.id/.test(FN_SOCIETE)
    && !/isSelfService =[\s\S]{0,120}admin_id === [a-z_]*\.?(body|corps|payload)/.test(FN_SOCIETE));
  t('un appelant sans role reconnu est refuse en 403',
    /callerRole !== "company_super_admin" &&\s*callerRole !== "super_admin" &&\s*!isSelfService/.test(FN_SOCIETE));
  /* La cible d un appel qui n est PAS un auto-service doit rester un admin. */
  t('la cible doit etre de role admin, sauf auto-service',
    /app_metadata\?\.role === "admin"/.test(FN_SOCIETE)
    && /if \(!isSelfService && !cibleEstAdmin\)/.test(FN_SOCIETE));
  /* Le controle de parente ne doit pas s appliquer a un auto-service : on ne demande
     pas a quelqu un d etre son propre parent. */
  t('le controle de parente reste reserve au Groupe',
    /if \(callerRole === "company_super_admin"\) \{[\s\S]{0,400}parent_company_id/.test(FN_SOCIETE));
  /* Le Groupe garde son propre auto-service, inchange. */
  t('l auto-service du Groupe est intact',
    /callerRole === "company_super_admin" && target_user_id === caller\.id/.test(FN_GROUPE));
}

console.log('\n=== 6. BUG 2 : UN EMAIL INCHANGE NE PART PLUS ===');
{
  t('l onglet compare avant d envoyer', /const emailAChange =/.test(ONGLET));
  t('la comparaison ignore la casse et les espaces',
    /normaliser\(email\) !== normaliser\(entity\.email \?\? ''\)/.test(ONGLET));
  t('et l email n est joint que s il a change',
    /email: canEditEmail && emailAChange \? email\.trim\(\) : ''/.test(ONGLET));
  /* Les deux appelants n envoient la cle que si la valeur est non vide : le contrat
     « vide = inchange » devient donc vrai de bout en bout. */
  const MODALES = sansCommentaires(
    ['src/pages/superadmin/views/super-admins/SASuperAdminDetailModal.tsx',
      'src/pages/company-super-admin/CSAAdminDetailModal.tsx'].map(lire).join('\n'),
  );
  t('les deux modales omettent la cle quand l email est vide',
    (MODALES.match(/\.\.\.\(draft\.email \? \{ email: draft\.email \} : \{\}\)/g) ?? []).length === 2);
}

console.log('\n=== 7. BUG 2 : LE CONFLIT D EMAIL SE DIT EN FRANCAIS ===');
{
  for (const [nom, fn] of [['Societe', FN_SOCIETE], ['Groupe', FN_GROUPE]] as [string, string][]) {
    t(`${nom} : la fonction passe par le modele de message`,
      /import \{ reponseErreurAuth \} from "\.\/messageErreurAuth\.ts"/.test(fn));
    t(`${nom} : plus aucun error.message relaye brut`,
      !/JSON\.stringify\(\{ error: error\.message \}\)/.test(fn));
    t(`${nom} : le statut vient du modele, il n est plus code en dur a 500`,
      /r\.statut/.test(fn));
    /*
     * ET SURTOUT : TOUTE occurrence de `error.message` doit passer par le modele.
     *
     * Ce garde-fou vient d'une mutation qui a SURVECU au premier tour : remplacer
     * `reponseErreurAuth(error.message)` par un objet ecrit a la main
     * (`{ message: error.message, statut: 500 }`) laissait toutes les assertions
     * vertes — l'import restait, `r.statut` restait, et la forme exacte interdite
     * ci-dessus n'etait pas reintroduite. Verifier la PRESENCE du modele ne suffit
     * donc pas : il faut verifier qu'on ne peut pas le contourner.
     */
    const brut = (fn.match(/error\.message/g) ?? []).length;
    const parLeModele = (fn.match(/reponseErreurAuth\(error\.message\)/g) ?? []).length;
    t(`${nom} : les ${brut} usages de error.message passent TOUS par le modele`,
      brut > 0 && brut === parLeModele);
    t(`${nom} : aucune reponse d erreur n est fabriquee a la main`,
      !/\{ message: error\.message/.test(fn) && !/message: error\.message,/.test(fn));
    t(`${nom} : le message rendu est celui du modele`, /error: r\.message/.test(fn));
  }
}

console.log('\n=== 8. BUG 2 : LES CHAMPS SONT DECOUPLES ===');
{
  for (const [nom, fn] of [['Societe', FN_SOCIETE], ['Groupe', FN_GROUPE]] as [string, string][]) {
    /* DEUX ecritures, pas une : l identite d abord, l email ensuite. */
    t(`${nom} : deux appels updateUserById distincts`,
      (fn.match(/auth\.admin\.updateUserById\(/g) ?? []).length === 2);
    t(`${nom} : l identite s ecrit seule`, /\{ user_metadata: /.test(fn));
    t(`${nom} : l email s ecrit seul, avec email_confirm`,
      /\{ email: next, email_confirm: true \}/.test(fn));
    t(`${nom} : l email n est ecrit que s il a change`,
      /next !== emailActuel/.test(fn));
    /* Et quand l email echoue APRES l identite, on dit que le reste est enregistre :
       sans cela l utilisateur refait une saisie qui avait abouti. */
    t(`${nom} : un echec d email annonce que le reste est enregistre`,
      /ont bien été enregistrées/.test(fn));
    t(`${nom} : et l expose dans la reponse`, /identite_enregistree/.test(fn));
  }
}

console.log('\n=== 9. BUG 2 : LE NOM DU GROUPE S ECRIT AUX DEUX ENDROITS ===');
{
  /*
   * `user_metadata.company` est ce que lisent les listes ; `companies.name` ce que
   * lisent les ecrans partant de la Societe. La fonction Groupe n ecrivait que le
   * premier, alors que son equivalent Societe ecrivait les deux.
   */
  t('la fonction Groupe ecrit companies', /from\("companies"\)\.update\(/.test(FN_GROUPE));
  t('elle y pose le nom', /nameUpdate\.name = companyName/.test(FN_GROUPE));
  t('elle cible la company du Groupe', /groupCompanyId/.test(FN_GROUPE));
  t('un nom vide est ignore, jamais ecrase',
    /typeof company === "string" && company\.trim\(\) \? company\.trim\(\) : undefined/.test(FN_GROUPE));
  t('la fonction Societe le faisait deja, et le fait toujours',
    /from\("companies"\)\.update\(/.test(FN_SOCIETE) && /nameUpdate\.name = companyName/.test(FN_SOCIETE));
}

console.log('\n=== 10. LES DEUX FONCTIONS RENDENT L EMAIL REELLEMENT EN PLACE ===');
{
  for (const [nom, fn] of [['Societe', FN_SOCIETE], ['Groupe', FN_GROUPE]] as [string, string][]) {
    t(`${nom} : la reponse porte l email en place`, /email: utilisateur\.email \?\? null/.test(fn));
    t(`${nom} : et dit si l email a ete applique`, /email_applique: emailApplique/.test(fn));
  }
  /* Sans ce champ, le client ne pourrait pas distinguer un email pose d un email
     inchange — c est la verification qui manquait au bug 1. */
  t('le client s en sert', /corps\.email/.test(SAVE_EMAIL));
}

console.log('\n=== 11. FUSEAU HORAIRE : L ACTEUR ET LA CIBLE SONT DEUX CHOSES ===');
{
  /*
   * LE DEFAUT, mesure le 23 octobre 2026 : l ecriture etait gardee par
   * `if (panelRole === 'admin')` sans jamais verifier que le porteur du jeton etait bien
   * cet admin. En Visu Societe, `auth.updateUser({ data: { timezone } })` — qui n agit
   * QUE sur l utilisateur connecte — ecrivait donc dans le compte du Talvex
   * Administrateur. Le reglage de la Societe n etait jamais enregistre.
   *
   * Ces assertions echouent si le defaut revient.
   */
  t('la distinction acteur / cible est nommee explicitement',
    /const estMonCompte = !effectiveUserId \|\| effectiveUserId === acteurId;/.test(TZ));
  t('l identifiant de l acteur vient de la session, et porte ce nom',
    /setActeurId\(user\.id\)/.test(TZ) && /const \[acteurId, setActeurId\]/.test(TZ));
  t('plus aucune variable nommee userId, qui melangeait les deux',
    !/\buserId\b/.test(TZ));

  /* LA GARDE CENTRALE : auth.updateUser n est appele QUE sur son propre compte. */
  const SET_TZ = corpsDe(TZ, 'const setTimezone = useCallback(async (tz: string) => {');
  t('le corps de setTimezone est bien isole', SET_TZ.length > 400);
  t('monCompte est recalcule sur la session relue, pas sur un etat perime',
    /const monCompte = !effectiveUserId \|\| effectiveUserId === session\.user\.id;/.test(SET_TZ));
  /*
   * L ancre ne doit PAS attendre un commentaire entre la garde et l appel : `SET_TZ`
   * est lu APRES `sansCommentaires`, donc tout commentaire a deja disparu. C est la
   * faute que cette assertion a commise au premier tour.
   */
  t('auth.updateUser du fuseau est garde par monCompte',
    /if \(monCompte\) \{\s*await supabase\.auth\.updateUser\(\{ data: \{ timezone: tz \} \}\);/.test(SET_TZ));
  t('plus aucun auth.updateUser de fuseau hors de cette garde',
    (SET_TZ.match(/auth\.updateUser\(\{ data: \{ timezone/g) ?? []).length === 1);
  /* Et en Visu, l ecriture passe par le serveur, vers la BONNE cible. */
  t('en Visu l ecriture passe par la voie serveur',
    /update-admin-for-super-admin/.test(SET_TZ));
  t('et elle vise la cible, pas l acteur',
    /body: JSON\.stringify\(\{ admin_id: cible, timezone: tz \}\)/.test(SET_TZ));
  t('la cible est effectiveUserId quand il existe',
    /const cible = effectiveUserId \?\? acteur;/.test(SET_TZ));

  /* EN LECTURE AUSSI : le fuseau seme ne doit pas etre celui de l observateur. */
  t('le fuseau n est seme depuis ses metadonnees que sur son propre compte',
    /if \(panelRole === 'admin' && estMonCompte\) \{/.test(TZ));
  /* Et la cle locale porte l identifiant du compte REGLE, sinon les deux reglages se
     melangeraient dans le meme localStorage. */
  t('la cle locale porte le compte regle',
    /const idPourLaCle = effectiveUserId \?\? user\.id;/.test(TZ));

  /* LA CHAINE DE PROPS : sans elle, le contexte ne peut pas savoir qu on est en Visu. */
  t('AppShell transmet effectiveUserId au fournisseur de fuseau',
    /<TimezoneProvider panelRole=\{panelRole\} effectiveUserId=\{effectiveUserId\}>/.test(SHELL));
  t('et le panel Societe en Visu le pose enfin',
    /panelRole="admin" useCompanyProvider companyId=\{impersonatedAdmin\.company_id\} effectiveUserId=\{impersonatedAdmin\.id\}/.test(ROUTEUR));
  /* Le Vendeur et le Client l avaient deja : c est la Societe qui manquait. */
  t('le Vendeur et le Client gardent le leur',
    (ROUTEUR.match(/effectiveUserId=\{impersonatedClient\.id\}/g) ?? []).length >= 3
    && (ROUTEUR.match(/effectiveUserId=\{impersonatedVendor\.auth_user_id \?\? impersonatedVendor\.id\}/g) ?? []).length >= 2);

  /* Cote serveur, la fonction doit savoir recevoir le fuseau. */
  t('la fonction serveur accepte timezone', /\btimezone\b/.test(FN_SOCIETE));
  t('et le pose dans user_metadata',
    /\.\.\.\(timezone !== undefined \? \{ timezone \} : \{\}\)/.test(FN_SOCIETE));
}

console.log('\n=== 12. TALVEX > MON COMPTE : MEME ARCHITECTURE QU INFO ADMIN ===');
{
  const SAVE_EMAIL_SA = corpsDe(MON_COMPTE, 'const saveEmail = async () => {');
  const SAVE_PWD_SA = corpsDe(MON_COMPTE, 'const savePassword = async () => {');

  t('les deux handlers existent et sont isoles',
    SAVE_EMAIL_SA.length > 300 && SAVE_PWD_SA.length > 150);
  t('plus aucun handler saveCredentials qui couplait les deux',
    !/const saveCredentials = async/.test(MON_COMPTE));

  /* L email par la voie serveur, exactement comme Info Admin. */
  t('l email passe par update-admin-for-super-admin',
    /update-admin-for-super-admin/.test(SAVE_EMAIL_SA));
  t('l email n est plus ecrit par auth.updateUser',
    !/auth\.updateUser/.test(SAVE_EMAIL_SA));
  t('aucun auth.updateUser du fichier ne porte un email',
    !/auth\.updateUser\([^)]*email/.test(MON_COMPTE));
  t('la cible est son propre compte', /admin_id: userId/.test(SAVE_EMAIL_SA));

  /* Email et mot de passe separes. */
  t('l appel email ne porte pas de mot de passe', !/password/.test(SAVE_EMAIL_SA));
  t('l enregistrement du mot de passe ne porte pas d email', !/\bemail\b/.test(SAVE_PWD_SA));
  t('plus aucun updates.password pose sans condition', !/updates\.password = pinStr/.test(MON_COMPTE));

  /* Aucune fausse confirmation. */
  t('un email inchange n ecrit rien', /if \(!emailAChange\)/.test(SAVE_EMAIL_SA));
  t('la reponse du serveur est relue', /corps\.email/.test(SAVE_EMAIL_SA));
  t('et comparee a ce qui etait demande',
    /normaliser\(applique\) !== normaliser\(vise\)/.test(SAVE_EMAIL_SA));
  t('la session est rafraichie apres succes', /refreshSession\(\)/.test(SAVE_EMAIL_SA));
  t('plus aucun message pretendant enregistrer les deux a la fois',
    !/Email et mot de passe enregistres/.test(MON_COMPTE));

  /* LES DEUX RENDUS. Ce fichier a une presentation Talixy et une presentation standard :
     corriger l une et oublier l autre laisserait le defaut vivant sur la moitie des
     themes. */
  t('deux boutons email, un par rendu',
    (MON_COMPTE.match(/data-testid="sa-mon-compte-save-email-btn"/g) ?? []).length === 2);
  t('deux boutons mot de passe, un par rendu',
    (MON_COMPTE.match(/data-testid="sa-mon-compte-save-password-btn"/g) ?? []).length === 2);
  t('les deux rendus appellent saveEmail',
    (MON_COMPTE.match(/onClick=\{saveEmail\}/g) ?? []).length === 2);
  t('les deux rendus appellent savePassword',
    (MON_COMPTE.match(/onClick=\{savePassword\}/g) ?? []).length === 2);
  t('deux messages email, un par rendu',
    (MON_COMPTE.match(/sa-mon-compte-email-message/g) ?? []).length === 2);

  /* Et l ecran parent fournit l identifiant, sans quoi la cible serait vide. */
  t('le parent passe userId aux deux usages',
    (PARENT_MON_COMPTE.match(/userId=\{userId\}/g) ?? []).length === 2);
  t('le parent lit cet identifiant depuis la session', /setUserId\(user\.id\)/.test(PARENT_MON_COMPTE));
}

console.log('\n=== 13. L AUTO-SERVICE ELARGI RESTE ETROIT ===');
{
  /*
   * L ecran « Mon compte » de Talvex vise un compte de role `super_admin`. La fonction
   * refusait toute cible qui n etait pas `admin` : il a fallu l ouvrir, et donc border
   * exactement ce qui est ouvert.
   */
  t('l auto-service est limite a admin et super_admin',
    /\(callerRole === "admin" \|\| callerRole === "super_admin"\) && admin_id === caller\.id/.test(FN_SOCIETE));
  t('la cible AUTRE que soi-meme doit toujours etre un admin',
    /if \(!isSelfService && !cibleEstAdmin\)/.test(FN_SOCIETE));
  /*
   * LE POINT LE PLUS IMPORTANT : `companies` n est ecrite que pour une cible `admin`.
   * Sans cette garde, un auto-service d un autre role pourrait renommer la Societe a
   * laquelle il appartient.
   */
  t('companies n est ecrite que pour une cible admin',
    /adminCompanyId && cibleEstAdmin &&/.test(FN_SOCIETE));
  t('et l absence de company n est plus une erreur pour un auto-service',
    /if \(!adminCompanyId && !isSelfService\)/.test(FN_SOCIETE));
  t('le controle de parente reste reserve au Groupe',
    /if \(callerRole === "company_super_admin"\) \{[\s\S]{0,500}parent_company_id/.test(FN_SOCIETE));
}

console.log('\n=== 14. PANEL GROUPE : LE TROISIEME ECRAN, ALIGNE ===');
{
  /*
   * Ce fichier portait le MEME defaut que les deux autres. Il a ete trouve en VERIFIANT
   * LA PRODUCTION, pas en le devinant : son ancien libelle « Enregistrer email et mot de
   * passe » subsistait dans les paquets servis alors que les deux autres avaient disparu.
   *
   * Nuance a garder en tete : son email etait DEJA applique immediatement, parce qu il
   * passe par `update-company-super-admin`. Ce qui manquait etait cote affichage.
   */
  const SAVE_EMAIL_CSA = corpsDe(CSA, 'const saveEmail = async () => {');
  const SAVE_PWD_CSA = corpsDe(CSA, 'const savePassword = async () => {');

  t('les deux handlers existent et sont isoles',
    SAVE_EMAIL_CSA.length > 300 && SAVE_PWD_CSA.length > 200);
  t('plus aucun handler saveCredentials qui couplait les deux',
    !/const saveCredentials = async/.test(CSA));
  t('plus aucun libelle pretendant enregistrer les deux a la fois',
    !/Enregistrer email et mot de passe/.test(CSA));

  /* La voie serveur, deja en place, mais appelee separement pour chaque champ. */
  t('l email part vers update-company-super-admin',
    /update-company-super-admin/.test(CSA));
  t('l email n est jamais ecrit par auth.updateUser',
    !/auth\.updateUser/.test(CSA));
  t('l appel email ne porte PAS de mot de passe',
    /appeler\(\{ email: vise \}\)/.test(SAVE_EMAIL_CSA) && !/password/.test(SAVE_EMAIL_CSA));
  t('l appel mot de passe ne porte PAS d email',
    /appeler\(\{ password: pinStr \}\)/.test(SAVE_PWD_CSA) && !/\bemail\b/.test(SAVE_PWD_CSA));
  /* Un seul endroit sait construire la requete : deux constructeurs finiraient par
     diverger sur la cible ou sur les en-tetes. */
  t('un seul constructeur de requete, partage',
    (CSA.match(/const appeler = async/g) ?? []).length === 1
    && (CSA.match(/functions\/v1\/update-company-super-admin/g) ?? []).length === 1);
  t('et il pose toujours la cible', /target_user_id: targetUserId/.test(CSA));

  /* Aucune fausse confirmation. */
  t('un email inchange n ecrit rien', /if \(!emailAChange\)/.test(SAVE_EMAIL_CSA));
  t('et il le dit au lieu d afficher un succes',
    /L.email n.a pas change/.test(CSA) && /type: 'info'/.test(CSA));
  t('la reponse du serveur est relue', /corps\?\.email/.test(SAVE_EMAIL_CSA));
  t('et comparee a ce qui etait demande',
    /normaliser\(applique\) !== normaliser\(vise\)/.test(SAVE_EMAIL_CSA));
  t('un serveur qui ne confirme pas rend une ERREUR',
    /n.a pas confirme le nouvel email/.test(CSA));

  /*
   * LA DISTINCTION ACTEUR / CIBLE, ici aussi : cet ecran sert au Groupe sur son compte
   * ET a Talvex qui l observe en Visu. Rafraichir la session de l observateur apres
   * avoir modifie le compte d un autre serait sans effet au mieux, trompeur au pire.
   */
  t('la session n est rafraichie que si l acteur est la cible',
    /if \(session\.user\.id === targetUserId\) await supabase\.auth\.refreshSession\(\)/.test(SAVE_EMAIL_CSA));

  /* Deux boutons, deux messages. */
  t('un bouton dedie a l email', /data-testid="csa-info-save-email-btn"/.test(CSA));
  t('un bouton dedie au mot de passe', /data-testid="csa-info-save-password-btn"/.test(CSA));
  t('deux etats d enregistrement distincts',
    /setSavingEmail/.test(CSA) && /setSaving\(/.test(CSA));
  t('deux messages distincts', /setEmailMsg/.test(CSA) && /setCredMsg/.test(CSA));

  /* LES TROIS ECRANS DISENT DESORMAIS LA MEME CHOSE. Trois vocabulaires pour un seul
     defaut, c est ce qu on vient de retirer : le test l interdit pour l avenir. */
  for (const phrase of ["Enregistrer l'email", 'Enregistrer le mot de passe']) {
    t(`« ${phrase} » est le libelle des TROIS ecrans`,
      SECTION.includes(phrase) && MON_COMPTE.includes(phrase) && CSA.includes(phrase));
  }
  t('et aucun des trois ne garde l ancien libelle couple',
    !/Enregistrer email et mot de passe/.test(SECTION)
    && !/Enregistrer email et mot de passe/.test(MON_COMPTE)
    && !/Enregistrer email et mot de passe/.test(CSA));
  t('les trois relisent l email reellement pose',
    /corps\.email/.test(SECTION) && /corps\.email/.test(MON_COMPTE) && /corps\?\.email/.test(CSA));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
