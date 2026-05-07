export type {
  ColumnDoc,
  ForeignKeyDoc,
  IndexDoc,
  PolicyDoc,
  TriggerDoc,
  TableDoc,
  SqlView,
  SqlFunction,
  DatabaseDoc,
} from './databaseDocTypes';

import type { DatabaseDoc } from './databaseDocTypes';
import { CORE_CRM_TABLES } from './databaseDocCoreCrm';
import { CHAT_TABLES } from './databaseDocChat';
import { INTERNAL_DOC_TABLES } from './databaseDocInternal';

const DATABASE_DOC: DatabaseDoc = {
  lastSyncedAt: '2026-03-17',
  groups: [
    { id: 'Core CRM', label: 'Core CRM', color: '#38bdf8' },
    { id: 'Chat', label: 'Chat', color: '#34d399' },
    { id: 'Documentation interne', label: 'Documentation interne', color: '#fb923c' },
  ],
  tables: [
    ...CORE_CRM_TABLES,
    ...CHAT_TABLES,
    ...INTERNAL_DOC_TABLES,
  ],
  views: [
    {
      name: 'leads_sans_statut_count',
      description: 'Compte le nombre de leads dont le champ statut est vide ou NULL. Utilisé dans le dashboard Vue d\'ensemble pour identifier les leads non qualifiés.',
      sql: "SELECT COUNT(*) FROM leads WHERE statut IS NULL OR statut = ''",
      returns: 'bigint (count)',
    },
  ],
  functions: [
    {
      name: 'cleanup_orphan_import_history()',
      description: 'Appelée après chaque DELETE sur leads. Si un import_history n\'a plus aucun lead associé (import_id), la ligne import_history est supprimée automatiquement. Évite les entrées orphelines dans l\'historique.',
      trigger: 'trg_cleanup_import_history — AFTER DELETE ON leads',
    },
    {
      name: 'update_crm_documentation_updated_at()',
      description: 'Met à jour le champ updated_at de crm_documentation à now() avant chaque UPDATE. Assure la traçabilité des modifications de documentation.',
      trigger: 'trg_crm_documentation_updated_at — BEFORE UPDATE ON crm_documentation',
    },
    {
      name: 'update_crm_context_cards_updated_at()',
      description: 'Met à jour le champ updated_at de crm_context_cards à now() avant chaque UPDATE.',
      trigger: 'trg_crm_context_cards_updated_at — BEFORE UPDATE ON crm_context_cards',
    },
    {
      name: 'find_duplicate_leads()',
      description: 'Détecte les doublons potentiels dans la table leads en comparant les adresses email et numéros de téléphone. Utilisée par le pipeline d\'import CSV pour la déduplication.',
    },
  ],
  globalRules: [
    'RLS activé sur toutes les tables — aucun accès sans policy explicite.',
    'Index conditionnels sur leads.email et leads.telephone : UNIQUE uniquement si non-NULL et non-vide. Permet plusieurs leads sans email sans violer la contrainte.',
    'vendor_admin_messages utilise le rôle "public" pour SELECT/INSERT/UPDATE — accessible sans authentification complète.',
    'sidebar_order a une PK composite (group_id, item_key) — pas de colonne id séparée. L\'upsert utilise onConflict=\'group_id,item_key\'.',
    'crm_documentation utilise tab_id (texte) comme PK — pas d\'UUID. Chaque onglet = 1 ligne avec son identifiant métier.',
    'leads.statut est un texte libre référençant statuts.nom — pas de FK. Si un statut est supprimé, les leads conservent leur valeur texte.',
    'rdv_proposals duplique lead_name, lead_phone, lead_email pour conserver la lisibilité si le lead est supprimé.',
    'messages implémente un soft delete (deleted_at + deleted_by_role). Les messages "supprimés" restent en base et sont filtrés côté application.',
    'Realtime activé sur la table leads — les mises à jour sont propagées en temps réel via Supabase Realtime (Postgres Changes).',
  ],
};

export default DATABASE_DOC;
