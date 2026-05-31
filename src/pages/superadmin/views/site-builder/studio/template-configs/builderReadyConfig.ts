import type { SectionConfig } from './templateConfigTypes';

export const BUILDER_READY_SECTIONS: SectionConfig[] = [
  {
    key: 'hero',
    label: 'Accueil',
    icon: 'Home',
    editableFields: [
      { key: 'title', label: 'Titre principal', type: 'text', placeholder: 'Votre entreprise, votre vitrine' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea', placeholder: 'Creez une presence en ligne professionnelle...' },
      { key: 'cta1_text', label: 'Bouton principal', type: 'text', placeholder: 'Commencer maintenant' },
      { key: 'cta1_link', label: 'Lien bouton principal', type: 'url', placeholder: '#contact' },
      { key: 'cta2_text', label: 'Bouton secondaire', type: 'text', placeholder: 'En savoir plus' },
      { key: 'cta2_link', label: 'Lien bouton secondaire', type: 'url', placeholder: '#services' },
    ],
    defaultContent: {
      title: 'Votre entreprise, votre vitrine',
      subtitle: 'Creez une presence en ligne professionnelle en quelques minutes. Simple, rapide et entierement personnalisable.',
      cta1_text: 'Commencer maintenant',
      cta1_link: '#contact',
      cta2_text: 'En savoir plus',
      cta2_link: '#services',
    },
    defaultStyles: { background_color: '#0f172a', accent_color: '#0ea5e9', text_color: '#ffffff' },
  },
  {
    key: 'services',
    label: 'Services',
    icon: 'Briefcase',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Tout ce dont vous avez besoin' },
      { key: 'subtitle', label: 'Description', type: 'textarea', placeholder: 'Des outils concus pour simplifier votre quotidien...' },
    ],
    defaultContent: {
      title: 'Tout ce dont vous avez besoin',
      subtitle: 'Des outils concus pour simplifier votre quotidien et faire grandir votre activite.',
    },
    defaultStyles: { background_color: '#111827', accent_color: '#0ea5e9' },
  },
  {
    key: 'contact',
    label: 'Contact',
    icon: 'Mail',
    editableFields: [
      { key: 'title', label: 'Titre', type: 'text', placeholder: 'Contactez-nous' },
      { key: 'subtitle', label: 'Description', type: 'textarea', placeholder: 'Une question, un projet ?' },
      { key: 'phone', label: 'Telephone', type: 'text', placeholder: '01 23 45 67 89' },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'contact@example.fr' },
      { key: 'address', label: 'Adresse', type: 'textarea', placeholder: '12 rue de la Paix, 75002 Paris' },
      { key: 'button_text', label: 'Texte du bouton', type: 'text', placeholder: 'Envoyer le message' },
    ],
    defaultContent: {
      title: 'Contactez-nous',
      subtitle: 'Une question, un projet ? Nous vous repondons sous 24h.',
      phone: '01 23 45 67 89',
      email: 'contact@example.fr',
      address: '12 rue de la Paix, 75002 Paris',
      button_text: 'Envoyer le message',
    },
    defaultStyles: { background_color: '#0f172a', accent_color: '#10b981' },
  },
];
