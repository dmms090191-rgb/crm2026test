import type { SectionConfig } from './templateConfigTypes';

export const RENEWABLE_ENERGY_SECTIONS: SectionConfig[] = [
  {
    key: 'header',
    label: 'En-tete',
    icon: 'Menu',
    editableFields: [
      { key: 'brand_name', label: 'Nom de la marque', type: 'text', placeholder: 'EcoSolaire' },
      { key: 'cta_text', label: 'Texte du bouton', type: 'text', placeholder: 'Espace client' },
    ],
    defaultContent: { brand_name: 'EcoSolaire', cta_text: 'Espace client' },
    defaultStyles: { background_color: '#030712', accent_color: '#10b981' },
  },
  {
    key: 'hero',
    label: 'Accueil',
    icon: 'Home',
    editableFields: [
      { key: 'title', label: 'Titre principal', type: 'text', placeholder: 'Votre energie solaire' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea', placeholder: 'Economisez jusqu\'a 40%...' },
      { key: 'cta1_text', label: 'Bouton 1', type: 'text', placeholder: 'Demander un devis' },
      { key: 'cta2_text', label: 'Bouton 2', type: 'text', placeholder: 'Nos solutions' },
    ],
    defaultContent: {
      title: 'Votre energie solaire, simplement',
      subtitle: 'Economisez jusqu\'a 40% sur vos factures d\'electricite avec nos solutions solaires.',
      cta1_text: 'Demander un devis',
      cta2_text: 'Nos solutions',
    },
    defaultStyles: { background_color: '#030712', accent_color: '#10b981', text_color: '#ffffff' },
  },
  {
    key: 'stats',
    label: 'Statistiques',
    icon: 'BarChart3',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Nos chiffres' },
    ],
    defaultContent: { title: 'Nos chiffres cles' },
    defaultStyles: { background_color: '#030712', accent_color: '#10b981' },
  },
  {
    key: 'solutions',
    label: 'Solutions',
    icon: 'Lightbulb',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Nos solutions' },
      { key: 'subtitle', label: 'Description', type: 'textarea' },
    ],
    defaultContent: { title: 'Nos solutions', subtitle: 'Des solutions adaptees a chaque besoin energetique.' },
    defaultStyles: { background_color: '#0f172a', accent_color: '#10b981' },
  },
  {
    key: 'simulator',
    label: 'Simulateur',
    icon: 'Calculator',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Simulez vos economies' },
      { key: 'subtitle', label: 'Description', type: 'textarea' },
    ],
    defaultContent: { title: 'Simulez vos economies', subtitle: 'Estimez votre potentiel d\'economie en quelques clics.' },
    defaultStyles: { background_color: '#030712', accent_color: '#06b6d4' },
  },
  {
    key: 'process',
    label: 'Processus',
    icon: 'ListOrdered',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Comment ca marche' },
      { key: 'subtitle', label: 'Description', type: 'textarea' },
    ],
    defaultContent: { title: 'Comment ca marche ?', subtitle: 'Un accompagnement de A a Z.' },
    defaultStyles: { background_color: '#0f172a', accent_color: '#10b981' },
  },
  {
    key: 'advantages',
    label: 'Avantages',
    icon: 'Award',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Pourquoi nous choisir' },
      { key: 'subtitle', label: 'Description', type: 'textarea' },
    ],
    defaultContent: { title: 'Pourquoi nous choisir ?', subtitle: 'Les avantages de notre solution.' },
    defaultStyles: { background_color: '#030712', accent_color: '#10b981' },
  },
  {
    key: 'client_space',
    label: 'Espace client',
    icon: 'UserCircle',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Votre espace client' },
      { key: 'subtitle', label: 'Description', type: 'textarea' },
    ],
    defaultContent: { title: 'Votre espace client', subtitle: 'Suivez vos projets et vos installations.' },
    defaultStyles: { background_color: '#0f172a', accent_color: '#10b981' },
  },
  {
    key: 'trust',
    label: 'Confiance',
    icon: 'HeartHandshake',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Ils nous font confiance' },
    ],
    defaultContent: { title: 'Ils nous font confiance' },
    defaultStyles: { background_color: '#030712', accent_color: '#10b981' },
  },
  {
    key: 'footer',
    label: 'Pied de page',
    icon: 'PanelBottom',
    editableFields: [
      { key: 'copyright', label: 'Copyright', type: 'text', placeholder: '2026 EcoSolaire' },
    ],
    defaultContent: { copyright: '2026 EcoSolaire. Tous droits reserves.' },
    defaultStyles: { background_color: '#020617', text_color: '#94a3b8' },
  },
];
