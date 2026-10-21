/*
  L'HISTORIQUE DES NOTIFICATIONS — la trace de ce qui a ete PRESENTE a quelqu'un.

  ---------- TROIS CHOSES DIFFERENTES, QU'IL NE FAUT PAS CONFONDRE ----------

    1. LA DONNEE METIER   un dossier, un contrat, un rendez-vous, une conversation
    2. LA NOTIFICATION    le fait qu'on ait signale cette donnee a quelqu'un
    3. L'HISTORIQUE       la trace durable de ce signalement

  Cette table ne porte que la troisieme. Supprimer une de ses lignes ne peut rien
  toucher d'autre — et ce n'est pas une promesse, c'est structurel : `source_id` designe
  SIX tables differentes, donc aucune cle etrangere ne peut l'y rattacher. Il n'existe
  aucun chemin, meme accidentel, de l'historique vers le metier.

  ---------- POURQUOI UNE TABLE, ET PAS UNE RELECTURE DES SOURCES ----------

  Audit du 20 octobre 2026, sur pieces :

    - les trois hooks de chat ne chargent QUE `read = false`. Un message lu n'est plus
      jamais retourne : il n'y a rien a relire ;
    - `seen_by_admin` est un BOOLEEN. Les quatre categories de rendez-vous n'ont donc
      aucun << quand a-t-on lu >> ;
    - le << vu >> des deux Agenda vit dans le localStorage, et il EXPIRE au bout de
      24 h : une notification vue redevient neuve le lendemain, sur le meme appareil ;
    - les alertes CRM Immo sont DERIVEES de dates. Une alerte que personne n'a touchee
      n'existe nulle part et ne peut pas exister retroactivement.

  Conclusion assumee, et dite a David avant d'ecrire cette ligne : L'HISTORIQUE COMMENCE
  AUJOURD'HUI. Aucun rattrapage n'est possible, sauf pour CRM Immo, dont
  `crm_immo_etats` conserve depuis l'origine la trace des alertes REELLEMENT AGIES.

  ---------- UN EPISODE, PAS UN MESSAGE ----------

  Pour les trois chats, une notification est une CONVERSATION, jamais un message : c'est
  la regle du depot, << un badge compte des conversations, jamais des messages >>.

  Une entree d'historique est donc un EPISODE DE NON-LU :
    source_id  = l'interlocuteur
    occurrence = l'horodatage du plus ancien message non lu de l'episode

  Jean ecrit trois fois : la cloche montre UNE notification, l'historique garde UNE
  entree. L'admin lit, Jean reecrit : nouvel episode, nouvelle entree. L'historique
  reflete ce qui a ete montre, pas le flux brut.

  ---------- LA SUPPRESSION EST UNE PIERRE TOMBALE ----------

  Supprimer n'efface pas la ligne : cela purge son contenu et la fige (`deleted_at`).
  La ligne survit pour que la contrainte d'unicite EMPECHE SA RECREATION — sans quoi le
  prochain passage de l'alimentation la ferait revenir. Le contenu, lui, part vraiment.

  Un declencheur rend cela structurel : une ligne supprimee ne se laisse ni reecrire ni
  effacer. C'est le patron de `guard_site_domain_events`, deja dans ce depot — adapte :
  ici c'est la SUPPRESSION qui est definitive, pas l'ecriture.

  ROLLBACK :
    DROP TABLE public.notification_history;
    DROP FUNCTION public.garde_notification_history();
*/

CREATE TABLE public.notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * LE CLOISONNEMENT, EN DEUX NIVEAUX.
   *
   * `company_id` seul ne suffit pas. `super_admin_messages` est cloisonnee par
   * `auth.uid() = admin_id`, pas par Societe, et les deux Agenda sont deja par
   * utilisateur. Sans `recipient_user_id`, deux administrateurs d'une meme Societe
   * verraient les Chats Direction et les agendas l'un de l'autre.
   */
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,

  /*
   * CE QUI IDENTIFIE LA NOTIFICATION.
   *
   * `source_id` ne porte AUCUNE cle etrangere : il designe six tables differentes. Cette
   * contrainte technique est ici la garantie que l'historique ne peut pas toucher au
   * metier. Consequence acceptee : une entree survit a la suppression de sa source —
   * << vous avez recu une notification sur un dossier aujourd'hui supprime >> est vrai,
   * et le bouton Voir doit le dire au lieu d'ouvrir une page vide.
   */
  category    text NOT NULL,
  source_type text NOT NULL,
  source_id   uuid NOT NULL,
  occurrence  text NOT NULL DEFAULT '',

  title   text NOT NULL,
  message text,

  /*
   * `occurred_at` est l'instant de l'EVENEMENT ; `created_at` celui de la LIGNE. Sans
   * cette distinction, un historique alimente avec du retard se trierait dans le
   * desordre. Pour CRM Immo en particulier, `crm_immo_etats.created_at` est la naissance
   * de la ligne d'etat, jamais celle de l'alerte.
   */
  occurred_at timestamptz NOT NULL,
  read_at     timestamptz,
  treated_at  timestamptz,
  archived_at timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notification_history_titre_non_vide CHECK (btrim(title) <> ''),
  CONSTRAINT notification_history_titre_borne    CHECK (char_length(title) <= 200),
  CONSTRAINT notification_history_message_borne  CHECK (message IS NULL OR char_length(message) <= 2000),

  /* Les dix categories du hub, et elles seules. Une categorie inventee ne doit pas
     pouvoir s'inserer en silence et rester invisible faute de carte correspondante. */
  CONSTRAINT notification_history_categorie_connue CHECK (category IN (
    'client', 'vendeur', 'super-admin', 'agenda', 'equipe',
    'propositions', 'rdv', 'decalages', 'demandes-decalage', 'crm-immo'
  )),

  /*
   * L'occurrence CRM Immo est le couple (genre, periode) de crm_immo_etats, dont la base
   * garantit deja le format. On le rend structurel ici aussi : le meme couple produit
   * TOUJOURS la meme occurrence, ce qui est ce qui rend l'anti-doublon et la pierre
   * tombale fiables dans le temps.
   */
  CONSTRAINT notification_history_occurrence_immo CHECK (
    category <> 'crm-immo' OR occurrence ~
      '^(fin_contrat:[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])|loyer:[0-9]{4}-(0[1-9]|1[0-2]))$'
  ),

  /*
   * L'ANTI-DOUBLON, et la pierre tombale.
   *
   * `company_id` est EN TETE, deliberement : une contrainte d'unicite est verifiee HORS
   * RLS, donc son erreur 23505 repond a travers les cloisons. C'est l'oracle de contenu
   * corrige le 19 octobre sur crm_immo_etats ; on ne le rouvre pas ici.
   */
  CONSTRAINT notification_history_unique_par_occurrence
    UNIQUE (company_id, recipient_user_id, category, source_id, occurrence)
);

/* La liste de la page : tout, du plus recent au plus ancien. */
CREATE INDEX notification_history_liste_idx
  ON public.notification_history (company_id, recipient_user_id, occurred_at DESC);

/* Le compteur de la cloche : les non lues, non archivees, non supprimees. Index PARTIEL —
   c'est la lecture la plus frequente de l'application, et la plus petite. */
CREATE INDEX notification_history_nouvelles_idx
  ON public.notification_history (company_id, recipient_user_id, occurred_at DESC)
  WHERE read_at IS NULL AND archived_at IS NULL AND deleted_at IS NULL;

ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

/* ---------------------------------------------------------------------------
   LES DROITS

   Le destinataire gere SES notifications, dans SA Societe. Le Groupe les LIT, sans
   jamais pouvoir ecrire a la place de sa fille : consulter ne doit pas faire baisser le
   compteur de quelqu'un d'autre. Talvex garde son acces, comme partout.
   --------------------------------------------------------------------------- */

CREATE POLICY "Recipient manage own notification history"
  ON public.notification_history FOR ALL TO authenticated
  USING (
    company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND recipient_user_id = auth.uid()
  )
  WITH CHECK (
    company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND recipient_user_id = auth.uid()
  );

/* FOR SELECT, et non FOR ALL : le Groupe consulte, il ne marque pas lu. */
CREATE POLICY "CSA read child company notification history"
  ON public.notification_history FOR SELECT TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
  );

CREATE POLICY "SA manage all notification history"
  ON public.notification_history FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'))
  WITH CHECK (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'));

/* ---------------------------------------------------------------------------
   LE GARDE — ce qui rend la suppression DURABLE
   --------------------------------------------------------------------------- */

CREATE OR REPLACE FUNCTION public.garde_notification_history()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  /*
   * Une ligne supprimee ne se laisse pas reecrire.
   *
   * L'alimentation est un UPSERT, et supabase-js ne sait pas exprimer
   * `ON CONFLICT ... DO UPDATE ... WHERE`. Sans ce garde, le prochain passage
   * ressusciterait la notification que l'utilisateur vient de supprimer.
   *
   * On IGNORE l'ecriture plutot que de lever : l'upsert porte un LOT de notifications,
   * et interrompre le lot entier pour une seule ligne supprimee ferait perdre les
   * autres. RETURN NULL supprime l'operation sur CETTE ligne et laisse passer le reste.
   *
   * NULL et non OLD : OLD reecrirait la ligne avec ses propres valeurs — une version
   * morte de plus a chaque chargement de page, pour un resultat visible identique.
   */
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  /*
   * Et la pierre tombale elle-meme ne s'efface pas : l'effacer ferait revenir la
   * notification au passage suivant. << Supprimer >> dans l'interface pose `deleted_at`
   * et purge le contenu ; personne ne retire la trace.
   */
  IF TG_OP = 'DELETE' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'notification_history : la trace de suppression est definitive'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_garde_notification_history
  BEFORE UPDATE OR DELETE ON public.notification_history
  FOR EACH ROW EXECUTE FUNCTION public.garde_notification_history();

COMMENT ON TABLE public.notification_history IS
  'Trace durable de ce qui a ete NOTIFIE a quelqu''un. Ne porte aucune cle etrangere vers le metier : source_id designe six tables, donc l''historique ne peut structurellement rien y toucher. Une entree de chat est un EPISODE de non-lu (interlocuteur + horodatage du plus ancien non-lu), jamais un message. La suppression pose deleted_at et purge le contenu ; la ligne survit pour empecher sa recreation par l''alimentation.';

COMMENT ON COLUMN public.notification_history.occurred_at IS
  'Instant de l''EVENEMENT metier, jamais celui de la ligne. C''est lui qui ordonne la page.';

COMMENT ON COLUMN public.notification_history.deleted_at IS
  'Pierre tombale. La ligne est conservee vide pour que la contrainte d''unicite empeche sa recreation. Le declencheur interdit de la reecrire comme de l''effacer.';
