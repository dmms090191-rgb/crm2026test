import type { TableDoc } from './databaseDocTypes';

export const INTERNAL_DOC_TABLES: TableDoc[] = [
  {
    name: 'crm_documentation',
    group: 'Documentation interne',
    description:
      'Stockage du contenu des onglets de documentation CRM. Chaque onglet (contexte-chatgpt, technologies, base-de-donnees, etc.) a une ligne. PK sur tab_id (texte). Un trigger met à jour updated_at automatiquement à chaque modification.',
    quickUnderstanding: {
      role: 'Persistence du contenu textuel de la documentation interne du CRM.',
      usedBy: 'Admin — page Documentation CRM.',
      relatedTables: [],
    },
    example:
      'L\'admin modifie l\'onglet "Optimisations" → upsert sur tab_id=\'optimisations\' avec le nouveau contenu. Le trigger met à jour updated_at.',
    columns: [
      { name: 'tab_id', type: 'text', nullable: false, primaryKey: true, constraints: 'Identifiant de l\'onglet (ex: technologies, base-de-donnees)' },
      { name: 'content', type: 'text', nullable: false, default: "''" },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', isSystem: true },
    ],
    foreignKeys: [],
    indexes: [
      { name: 'crm_documentation_pkey', columns: ['tab_id'], unique: true },
    ],
    policies: [
      { name: 'Authenticated users can read documentation', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can insert documentation', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can update documentation', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
    ],
    triggers: [
      { name: 'trg_crm_documentation_updated_at', event: 'BEFORE UPDATE', function: 'update_crm_documentation_updated_at()', description: 'Met à jour updated_at à now() avant chaque UPDATE.' },
    ],
  },
  {
    name: 'crm_notes',
    group: 'Documentation interne',
    description:
      'Notes horodatées associées à une date et un créneau horaire. Utilisées pour les réunions, décisions ou observations internes. Les champs time_start et time_end sont des textes libres (ex: "14:00") pour plus de flexibilité.',
    quickUnderstanding: {
      role: 'Prise de notes datées et horodatées pour les équipes internes.',
      usedBy: 'Admin — onglet Contexte ChatGPT (section Notes).',
      relatedTables: [],
    },
    example:
      'Note de réunion du 17/03 à 10h00-11h30 → note_date=2026-03-17, time_start=\'10:00\', time_end=\'11:30\', title=\'Réunion stratégique\'.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'title', type: 'text', nullable: false, default: "''" },
      { name: 'content', type: 'text', nullable: false, default: "''" },
      { name: 'note_date', type: 'date', nullable: false, default: 'CURRENT_DATE' },
      { name: 'time_start', type: 'text', nullable: false, default: "''", constraints: 'Format libre — ex: 14:00' },
      { name: 'time_end', type: 'text', nullable: false, default: "''", constraints: 'Format libre — ex: 15:30' },
      { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      { name: 'updated_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
    ],
    foreignKeys: [],
    indexes: [
      { name: 'crm_notes_pkey', columns: ['id'], unique: true },
    ],
    policies: [
      { name: 'Authenticated users can select notes', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can insert notes', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can update notes', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can delete notes', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
  },
  {
    name: 'crm_ideas',
    group: 'Documentation interne',
    description:
      'Tableau d\'idées avec statut et position d\'affichage. Permet de suivre les idées de fonctionnalités ou d\'améliorations. Le champ status permet de filtrer par état (idea, in-progress, done). Le champ position contrôle l\'ordre d\'affichage.',
    quickUnderstanding: {
      role: 'Kanban ou liste d\'idées et améliorations à implémenter.',
      usedBy: 'Admin — onglet Idées.',
      relatedTables: [],
    },
    example:
      'L\'admin crée l\'idée "Ajouter pagination" → status=\'idea\', position=0. Quand le développement commence → status=\'in-progress\'. Une fois livré → status=\'done\'.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'title', type: 'text', nullable: false, default: "''" },
      { name: 'content', type: 'text', nullable: false, default: "''" },
      { name: 'idea_date', type: 'date', nullable: false, default: 'CURRENT_DATE' },
      { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      { name: 'updated_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      { name: 'status', type: 'text', nullable: false, default: "'idea'", constraints: "Valeurs suggérées : 'idea' | 'in-progress' | 'done'" },
      { name: 'position', type: 'integer', nullable: false, default: '0', constraints: 'Ordre d\'affichage' },
    ],
    foreignKeys: [],
    indexes: [
      { name: 'crm_ideas_pkey', columns: ['id'], unique: true },
    ],
    policies: [
      { name: 'Authenticated users can read ideas', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can insert ideas', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can update ideas', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can delete ideas', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
  },
  {
    name: 'crm_context_cards',
    group: 'Documentation interne',
    description:
      'Cartes de contexte affichées dans l\'onglet "Contexte ChatGPT". Chaque carte contient un titre et un contenu. Ordonnées par position. Un trigger met à jour updated_at automatiquement.',
    quickUnderstanding: {
      role: 'Blocs de contexte structurés pour préparer les prompts ChatGPT.',
      usedBy: 'Admin — onglet Contexte ChatGPT.',
      relatedTables: [],
    },
    example:
      'Carte "Stack technique" avec contenu "React + Supabase + Tailwind" → sert de bloc de contexte réutilisable pour les sessions ChatGPT.',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', primaryKey: true, isSystem: true },
      { name: 'title', type: 'text', nullable: false, default: "''" },
      { name: 'content', type: 'text', nullable: false, default: "''" },
      { name: 'position', type: 'integer', nullable: false, default: '0', constraints: 'Ordre d\'affichage' },
      { name: 'created_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
      { name: 'updated_at', type: 'timestamptz', nullable: true, default: 'now()', isSystem: true },
    ],
    foreignKeys: [],
    indexes: [
      { name: 'crm_context_cards_pkey', columns: ['id'], unique: true },
    ],
    policies: [
      { name: 'Authenticated users can select context cards', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can insert context cards', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can update context cards', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can delete context cards', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
    triggers: [
      { name: 'trg_crm_context_cards_updated_at', event: 'BEFORE UPDATE', function: 'update_crm_context_cards_updated_at()', description: 'Met à jour updated_at à now() avant chaque UPDATE.' },
    ],
  },
  {
    name: 'sidebar_order',
    group: 'Documentation interne',
    description:
      'Persistance de l\'ordre des éléments dans la sidebar de la documentation CRM. PK composite (group_id, item_key) — pas de colonne id. Deux groupes : "docs" (onglets de documentation) et "pages" (pages CRM). Upsert via onConflict=\'group_id,item_key\'.',
    quickUnderstanding: {
      role: 'Sauvegarder l\'ordre de réorganisation des onglets de la documentation.',
      usedBy: 'Admin — mode réorganisation de la documentation CRM.',
      relatedTables: [],
    },
    example:
      'L\'admin glisse l\'onglet "Technologies" en première position → upsert de toutes les lignes du groupe "docs" avec les nouvelles positions. La prochaine ouverture charge l\'ordre sauvegardé.',
    columns: [
      { name: 'group_id', type: 'text', nullable: false, primaryKey: true, constraints: "Valeurs : 'docs' | 'pages'" },
      { name: 'item_key', type: 'text', nullable: false, primaryKey: true, constraints: 'id de l\'onglet ou label de la page' },
      { name: 'position', type: 'integer', nullable: false, default: '0' },
    ],
    foreignKeys: [],
    indexes: [
      { name: 'sidebar_order_pkey', columns: ['group_id', 'item_key'], unique: true },
    ],
    policies: [
      { name: 'Authenticated users can read sidebar order', operation: 'SELECT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can insert sidebar order', operation: 'INSERT', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can update sidebar order', operation: 'UPDATE', roles: ['authenticated'], condition: 'true' },
      { name: 'Authenticated users can delete sidebar order', operation: 'DELETE', roles: ['authenticated'], condition: 'true' },
    ],
  },
];
