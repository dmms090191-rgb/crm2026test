export interface BodyAssessment {
  id: string;
  client_id: string;
  company_id: string;
  created_by_user_id: string;
  weight: number | null;
  bmi: number | null;
  body_fat_percent: number | null;
  water_percent: number | null;
  muscle: number | null;
  morphology: string | null;
  bone_mass: number | null;
  body_age: number | null;
  visceral_fat: number | null;
  protein_mass: number | null;
  global_body_score: number | null;
  chest_measure: number | null;
  waist_measure: number | null;
  belly_measure: number | null;
  hips_measure: number | null;
  thigh_measure: number | null;
  arm_measure: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BodyAssessmentFormData {
  weight: string;
  bmi: string;
  body_fat_percent: string;
  water_percent: string;
  muscle: string;
  morphology: string;
  bone_mass: string;
  body_age: string;
  visceral_fat: string;
  protein_mass: string;
  global_body_score: string;
  chest_measure: string;
  waist_measure: string;
  belly_measure: string;
  hips_measure: string;
  thigh_measure: string;
  arm_measure: string;
  notes: string;
}

export const EMPTY_FORM: BodyAssessmentFormData = {
  weight: '',
  bmi: '',
  body_fat_percent: '',
  water_percent: '',
  muscle: '',
  morphology: '',
  bone_mass: '',
  body_age: '',
  visceral_fat: '',
  protein_mass: '',
  global_body_score: '',
  chest_measure: '',
  waist_measure: '',
  belly_measure: '',
  hips_measure: '',
  thigh_measure: '',
  arm_measure: '',
  notes: '',
};

export interface FormField {
  key: keyof BodyAssessmentFormData;
  label: string;
  unit?: string;
  type: 'number' | 'text' | 'textarea';
  placeholder?: string;
}

export const FORM_SECTIONS: { title: string; icon: string; fields: FormField[] }[] = [
  {
    title: 'Mesures principales',
    icon: 'scale',
    fields: [
      { key: 'weight', label: 'Poids', unit: 'kg', type: 'number', placeholder: '72.5' },
      { key: 'bmi', label: 'IMC', type: 'number', placeholder: '24.3' },
      { key: 'body_age', label: 'Age corporel', unit: 'ans', type: 'number', placeholder: '32' },
      { key: 'global_body_score', label: 'Score global', type: 'number', placeholder: '85' },
    ],
  },
  {
    title: 'Composition corporelle',
    icon: 'body',
    fields: [
      { key: 'body_fat_percent', label: 'Masse grasse', unit: '%', type: 'number', placeholder: '18.5' },
      { key: 'water_percent', label: 'Hydratation', unit: '%', type: 'number', placeholder: '55.0' },
      { key: 'muscle', label: 'Masse musculaire', unit: 'kg', type: 'number', placeholder: '35.2' },
      { key: 'bone_mass', label: 'Masse osseuse', unit: 'kg', type: 'number', placeholder: '3.1' },
      { key: 'visceral_fat', label: 'Graisse viscerale', type: 'number', placeholder: '8' },
      { key: 'protein_mass', label: 'Masse proteique', unit: 'kg', type: 'number', placeholder: '12.5' },
      { key: 'morphology', label: 'Morphologie', type: 'text', placeholder: 'Mesomorphe' },
    ],
  },
  {
    title: 'Mensurations',
    icon: 'ruler',
    fields: [
      { key: 'chest_measure', label: 'Tour de poitrine', unit: 'cm', type: 'number', placeholder: '95' },
      { key: 'waist_measure', label: 'Tour de taille', unit: 'cm', type: 'number', placeholder: '82' },
      { key: 'belly_measure', label: 'Tour de ventre', unit: 'cm', type: 'number', placeholder: '88' },
      { key: 'hips_measure', label: 'Tour de hanches', unit: 'cm', type: 'number', placeholder: '98' },
      { key: 'thigh_measure', label: 'Tour de cuisse', unit: 'cm', type: 'number', placeholder: '56' },
      { key: 'arm_measure', label: 'Tour de bras', unit: 'cm', type: 'number', placeholder: '32' },
    ],
  },
  {
    title: 'Notes',
    icon: 'notes',
    fields: [
      { key: 'notes', label: 'Observations', type: 'textarea', placeholder: 'Notes supplementaires...' },
    ],
  },
];
