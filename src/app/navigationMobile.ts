/*
 * LA NAVIGATION DU TELEPHONE : UN FILTRE, PAS UNE LISTE.
 *
 * ---------- CE QUE CE MODULE REMPLACE ----------
 *
 * La barre du bas de la coquille telephone etait une liste ECRITE EN DUR, role par role
 * (getTabsForRole / getMoreTabs), sans aucun lien avec la navigation du bureau. Mesure du
 * 26/10/2026 : une Societe voyait 5 onglets sur son telephone contre 20 sur son site —
 * 12 onglets visibles etaient tout simplement inatteignables. Et la liste en dur ignorait
 * les masquages, les renommages et la reorganisation : masquer un onglet sur le bureau ne
 * le retirait pas du telephone, le renommer ne le renommait pas.
 *
 * ---------- LE PRINCIPE, EN UNE PHRASE ----------
 *
 * La liste vient de `layout.visible` — la MEME source que la barre laterale, apres
 * masquage, ordre, renommage et permissions — puis elle est FILTREE par l'ensemble
 * explicite des onglets que la coquille sait reellement rendre.
 *
 * Une seule source pour la liste. Un seul ensemble declare pour les vues. Le filtre entre
 * les deux (talixy/mobileNav.ts, filtrerRendables). Un onglet sans vue n'apparait donc
 * PAS, au lieu d'apparaitre et de mentir.
 *
 * ---------- LE DEFAUT QU'ON FERME ETAIT DEJA LA, DORMANT ----------
 *
 * Sous le theme Talixy, le mini arc de Talvex Administrateur tirait bien ses onglets de
 * layout.visible : il en proposait 24. Le `switch` de rendu n'en connaissait que 11, et
 * finissait par `default: return <SADashboard />`.
 *
 * Choisir « Logo » affichait donc le Dashboard SOUS LE TITRE « Logo », puisque le libelle
 * venait de la vraie liste et la vue du switch incomplet. Treize onglets mentaient ainsi.
 * Pas un ecran vide, pas une erreur : la MAUVAISE page sous le bon titre.
 *
 * Mesure du 27/10/2026 en base (role postgres, la RLS est ignoree) : aucun compte n'a le
 * theme `talixy` — le Talvex Administrateur est en `graphite`, les Societes en `graphite`
 * ou `dark`. Le defaut n'avait donc jamais pu se voir. C'est exactement le piege de la
 * coquille elle-meme : du code qu'aucun chemin n'atteint n'est pas du code qui marche.
 */

/** Les quatre roles que la coquille telephone sait servir. Le Groupe en est exclu (App.tsx). */
export type RoleTelephone = 'super_admin' | 'admin' | 'vendor' | 'client';

/**
 * LES ONGLETS QUE LA COQUILLE SAIT REELLEMENT RENDRE, role par role.
 *
 * Cet ensemble et le `switch` de PwaMobileShell.renderView doivent dire la MEME chose. Ce
 * n'est pas une consigne d'usage : un releve le compte DANS LES DEUX SENS
 * (scripts/runtime/coquilleMobile.test.ts). Declarer un id ici sans ecrire son `case` fait
 * rougir la suite, et ecrire un `case` sans le declarer ici aussi.
 *
 * Les onglets ecrits dans l'ordre de leur compartiment, pour que la relecture se compare a
 * l'oeil avec LAYOUT_SECTIONS. L'ordre AFFICHE, lui, ne vient jamais d'ici : il vient de
 * layout.visible, donc de la reorganisation de l'utilisateur.
 *
 * ---------- CE QUI N'Y EST PAS EST ABSENT VOLONTAIREMENT ----------
 *
 *   Societe  `site`                     tire le constructeur de site (86 fichiers, apercu
 *                                       en cadre) : sa propre decision.
 *            `import-leads`             3 tables sans variante telephone ; un import CSV
 *                                       depuis un telephone demande sa propre decision.
 *            `inscription`              lit une colonne que rien n'alimente : elle AFFIRME
 *                                       zero demande en attente alors qu'il y en a 11
 *                                       (mesure en base). Voir le detail plus bas.
 *            `telecharger`             dans l'APK, lit le manifeste EMBARQUE et annonce
 *                                       « Bientot disponible » pour une version publiee.
 *            `info-admin`               peut presenter une identite fabriquee et accuser le
 *                                       PIN de l'utilisateur. Voir le detail plus bas.
 *            `historique-notifications` son RENDU est pret (HistoriqueCards, en md:hidden),
 *                                       son ALIMENTATION ne l'est pas :
 *                                       useHistoriqueNotifications exige `sources`, bati
 *                                       dans AdminDashboard a partir de 11 sources de
 *                                       notifications, et son commentaire tranche —
 *                                       « appele UNE SEULE FOIS, deux appels donneraient
 *                                       deux verites ». Le monter seul afficherait un
 *                                       historique VIDE, donc faux. C'est precisement ce
 *                                       que cet ensemble sert a empecher.
 *            trois onglets masques par defaut (logo, calquer-logo, application) et les
 *            trois autres (cerveau-ia, editeur-ia, tuto) : masques cote bureau, donc
 *            absents de layout.visible de toute facon.
 *
 *   Talvex   les 12 vues de configuration et d'outillage (logo, themes, sauvegarde,
 *            editeur-ia, tests-systeme, sites, application, ameliorations...) : etape 3.
 *            A noter pour cette etape : SAViewRouter enveloppe `sauvegarde` dans
 *            <SimulationProvider> — le fournisseur est deja pose autour de la coquille,
 *            mais il faudra le verifier plutot que le supposer.
 *
 *   Partout  `tuto`, dont la vue est un placeholder « Contenu a venir ».
 *
 * ---------- CRM IMMO MERITE SON MOT ----------
 *
 * Son entree n'est pas declaree dans LAYOUT_SECTIONS : elle est INJECTEE par
 * sectionsAvecCrmImmo selon le droit reel (has_crm_immo_access). Cette injection est
 * conservee a l'identique sur telephone — la source dit donc exactement ce que dit le
 * bureau — mais `crm-immo` n'etant pas dans cet ensemble, le filtre le retire jusqu'a ce
 * que sa vue arrive. Le droit est respecte, et l'onglet ne mentira pas en attendant.
 */
export const VUES_TELEPHONE: Record<RoleTelephone, readonly string[]> = {
  super_admin: [
    /* Principal */      'dashboard', 'mon-compte',
    /* Gestion */        'super-admins', 'statuts', 'admins', 'crm-societe',
    /* Communication */  'chat-admin',
    /* Maintenance */    'documentation-crm', 'system',
    /* Outils */         'api-ia', 'cerveau-ia',
  ],
  admin: [
    /* Deja rendues avant le 27/10/2026. */
    'vue-ensemble', 'crm', 'statuts',
    'chat-client', 'chat-vendeur', 'chat-super-admin',
    'agenda', 'propositions-rdv',
    /*
     * Les quatre ajoutees le 27/10/2026.
     *
     * J'en avais annonce huit, puis sept. L'audit de dependances en a disqualifie trois, et
     * la raison est la meme a chaque fois : j'avais juge leur RENDU et pas ce qu'elles
     * DISENT. Les trois motifs sont mesures, et consignes ici pour qu'on ne les reouvre pas
     * par inadvertance a l'etape 2 :
     *
     *   `inscription`  La requete est `.eq('company_id', companyId)`
     *                  (Inscription.tsx:24). Or registrations.company_id n'est alimente par
     *                  AUCUN chemin d'insertion : la colonne a ete ajoutee NULLABLE avec un
     *                  backfill unique, et les deux inserts vivants (RegisterModal.tsx:36,
     *                  TalvexRegisterModal.tsx:81) l'omettent. Releve en base le 27/10/2026
     *                  (role postgres, RLS ignoree) : 11 lignes `pending`, TOUTES avec
     *                  company_id a NULL ; les 3 lignes rattachees sont toutes `accepted`.
     *                  La vue rend donc zero ligne en attente pour les 7 Societes, et elle
     *                  l'AFFIRME — « Aucune demande en attente », badge 0. Onze demandes
     *                  attendent. Defaut PREEXISTANT du bureau, pas de ce chantier, mais
     *                  l'exposer sur telephone serait publier un ecran faux.
     *
     *   `telecharger`  CentreTelechargement fait `fetch('/telechargements.json')` — une URL
     *                  RELATIVE. Dans la WebView de l'APK, l'origine est le paquet local :
     *                  elle lit donc le manifeste EMBARQUE. Mesure des deux fichiers :
     *                  l'embarque dit android=bientot et windows=0.1.0, le public dit
     *                  android=disponible 0.1.1 et windows=0.1.1. Dans l'application, cet
     *                  onglet annonce donc « Bientot disponible » pour Android alors que la
     *                  0.1.1 est publiee, et propose un installateur Windows perime. Et
     *                  c'est STRUCTUREL : l'activation d'une version est posterieure a sa
     *                  mise en ligne, elle-meme posterieure au build — un APK vN ne peut
     *                  jamais embarquer un manifeste qui declare vN disponible.
     *
     *   `info-admin`   InfoAdmin.tsx:59 : `refreshSession().then(getUser).then(({data:{user}})
     *                  => { if (user) {...} })`. Aucun `else`, aucun `.catch`, aucun etat de
     *                  chargement ni d'erreur. Si `user` revient nul — jeton perime, hors
     *                  ligne, application reprise d'arriere-plan — rien n'est pose, et c'est
     *                  DEFINITIF : l'ecran affiche le defaut dur 'Administrateur', nom et
     *                  e-mail vides, et la synchronisation du PIN appelle
     *                  signInWithPassword avec un e-mail VIDE puis repond « Code incorrect ».
     *                  L'application accuse le PIN de l'utilisateur. Le bureau n'exerce
     *                  jamais ce chemin : AdminViewRenderer.tsx:118 monte InfoAdmin EN
     *                  PERMANENCE en `display:none`, juste apres un rafraichissement reussi.
     *                  La coquille, elle, la monte AU MOMENT DU TAP, des heures plus tard.
     *
     * Les quatre qui restent ont ete verifiees montables seules sous les seuls fournisseurs
     * que la coquille pose — Theme, Timezone, CompanyId, Simulation — et surtout verifiees
     * sur ce qu'elles AFFICHENT. `liste-vendeurs` avait deja son rendu telephone ecrit et
     * jamais atteint (ListeVendeursMobileCard, en md:hidden).
     */
    'boutique', 'cabinet', 'liste-vendeurs', 'agenda-equipe',
  ],
  vendor: [
    /*
     * `chat-client` avait sa vue et AUCUN chemin n'y menait : il etait absent de la barre
     * en dur. Une vue morte, mesuree le 26/10/2026. La derivation la rend atteignable
     * sans qu'on ait rien a ecrire pour elle.
     */
    'vue-ensemble', 'leads', 'agenda', 'propositions-rdv', 'chat-admin', 'chat-client',
  ],
  client: [
    'vue-ensemble', 'messagerie', 'agenda', 'propositions-rdv',
  ],
};
