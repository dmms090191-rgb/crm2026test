import type { SectionConfig } from './templateConfigTypes';

export const GENERIC_SECTIONS: SectionConfig[] = [
  { key: 'header', label: 'En-tete', icon: 'Menu', editableFields: [], defaultContent: {}, defaultStyles: {} },
  { key: 'hero', label: 'Accueil', icon: 'Home', editableFields: [], defaultContent: {}, defaultStyles: {} },
  { key: 'features', label: 'Fonctionnalites', icon: 'Star', editableFields: [], defaultContent: {}, defaultStyles: {} },
  { key: 'about', label: 'A propos', icon: 'Info', editableFields: [], defaultContent: {}, defaultStyles: {} },
  { key: 'contact', label: 'Contact', icon: 'Mail', editableFields: [], defaultContent: {}, defaultStyles: {} },
  { key: 'footer', label: 'Pied de page', icon: 'PanelBottom', editableFields: [], defaultContent: {}, defaultStyles: {} },
];
