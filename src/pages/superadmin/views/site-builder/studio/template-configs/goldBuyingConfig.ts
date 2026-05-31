import type { SectionConfig } from './templateConfigTypes';

export const GOLD_BUYING_SECTIONS: SectionConfig[] = [
  {
    key: 'nav',
    label: 'En-tete',
    icon: 'Menu',
    editableFields: [
      { key: 'brand_name', label: 'Nom de la marque', type: 'text', placeholder: 'La Compagnie de l\'Or' },
      { key: 'cta_text', label: 'Texte du bouton', type: 'text', placeholder: 'Nous contacter' },
    ],
    defaultContent: { brand_name: 'La Compagnie de l\'Or', cta_text: 'Nous contacter' },
    defaultStyles: { background_color: '#0a0a0a', text_color: '#ffffff' },
  },
  {
    key: 'hero',
    label: 'Accueil',
    icon: 'Home',
    editableFields: [
      { key: 'title', label: 'Titre principal', type: 'text', placeholder: 'Vendez votre or' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea', placeholder: 'Estimation gratuite, paiement immediat et 100% securise.' },
      { key: 'cta1_text', label: 'Bouton 1', type: 'text', placeholder: 'Estimation gratuite' },
      { key: 'cta2_text', label: 'Bouton 2', type: 'text', placeholder: 'Voir nos services' },
      { key: 'hero_image', label: 'Image principale', type: 'image' },
    ],
    defaultContent: {
      title: 'Vendez votre or au meilleur prix',
      subtitle: 'Estimation gratuite, paiement immediat et 100% securise.',
      cta1_text: 'Estimation gratuite',
      cta2_text: 'Voir nos services',
    },
    defaultStyles: { background_color: '#0a0a0a', accent_color: '#d4a017', text_color: '#ffffff' },
  },
  {
    key: 'services',
    label: 'Services',
    icon: 'Briefcase',
    editableFields: [
      { key: 'title', label: 'Titre de la section', type: 'text', placeholder: 'Nos services' },
      { key: 'subtitle', label: 'Description', type: 'textarea', placeholder: 'Decouvrez nos services premium...' },
    ],
    defaultContent: { title: 'Nos services', subtitle: 'Decouvrez nos services premium de rachat d\'or et metaux precieux.' },
    defaultStyles: { background_color: '#0a0a0a', accent_color: '#d4a017' },
  },
  {
    key: 'process',
    label: 'Processus',
    icon: 'ListOrdered',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Comment ca marche ?' },
      { key: 'subtitle', label: 'Description', type: 'textarea' },
    ],
    defaultContent: { title: 'Comment ca marche ?', subtitle: 'Un processus simple en 3 etapes.' },
    defaultStyles: { background_color: '#111111', accent_color: '#d4a017' },
  },
  {
    key: 'offers',
    label: 'Offres',
    icon: 'Tag',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Nos offres' },
      { key: 'subtitle', label: 'Description', type: 'textarea' },
    ],
    defaultContent: { title: 'Nos offres du moment', subtitle: 'Profitez de nos meilleures offres de rachat.' },
    defaultStyles: { background_color: '#0a0a0a', accent_color: '#d4a017' },
  },
  {
    key: 'events',
    label: 'Evenements',
    icon: 'Calendar',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Evenements' },
      { key: 'subtitle', label: 'Description', type: 'textarea' },
    ],
    defaultContent: { title: 'Nos evenements', subtitle: 'Retrouvez-nous lors de nos prochains evenements.' },
    defaultStyles: { background_color: '#111111', accent_color: '#d4a017' },
  },
  {
    key: 'guarantees',
    label: 'Garanties',
    icon: 'ShieldCheck',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Nos garanties' },
      { key: 'subtitle', label: 'Description', type: 'textarea' },
    ],
    defaultContent: { title: 'Nos garanties', subtitle: 'Votre confiance est notre priorite.' },
    defaultStyles: { background_color: '#0a0a0a', accent_color: '#d4a017' },
  },
  {
    key: 'contact',
    label: 'Contact',
    icon: 'Mail',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Contactez-nous' },
      { key: 'address', label: 'Adresse', type: 'textarea' },
      { key: 'phone', label: 'Telephone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
    ],
    defaultContent: { title: 'Contactez-nous', address: '', phone: '', email: '' },
    defaultStyles: { background_color: '#111111', accent_color: '#d4a017' },
  },
  {
    key: 'footer',
    label: 'Pied de page',
    icon: 'PanelBottom',
    editableFields: [
      { key: 'copyright', label: 'Copyright', type: 'text', placeholder: '2026 La Compagnie de l\'Or' },
    ],
    defaultContent: { copyright: '2026 La Compagnie de l\'Or. Tous droits reserves.' },
    defaultStyles: { background_color: '#050505', text_color: '#999999' },
  },
];
