import { useState } from 'react';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export interface Prospect {
  id: string;
  manager_first_name: string;
  manager_last_name: string;
  nom: string;
  site_internet: string;
  lien_google_maps: string;
  telephone: string;
  adresse: string;
  secteur_activite: string;
  descriptif: string;
  statut: string;
  created_at: string;
}

interface Props {
  existing?: Prospect | null;
  onSave: (data: Omit<Prospect, 'id' | 'created_at'>) => void;
  onClose: () => void;
}

const FIELDS: { key: keyof Omit<Prospect, 'id' | 'created_at' | 'statut'>; label: string; placeholder: string; type?: string }[] = [
  { key: 'manager_first_name', label: 'Prenom du gerant', placeholder: 'Ex: David' },
  { key: 'manager_last_name', label: 'Nom du gerant', placeholder: 'Ex: Cohen' },
  { key: 'nom', label: 'Nom de la societe', placeholder: 'Ex: Studio Digital Paris' },
  { key: 'site_internet', label: 'Site internet', placeholder: 'https://...' },
  { key: 'lien_google_maps', label: 'Lien Google Maps', placeholder: 'https://maps.google.com/...' },
  { key: 'telephone', label: 'Telephone', placeholder: '+33 1 23 45 67 89' },
  { key: 'adresse', label: 'Adresse', placeholder: '12 Rue de la Paix, 75002 Paris' },
  { key: 'secteur_activite', label: 'Secteur d\'activite', placeholder: 'Ex: Marketing digital' },
];

function formatFrenchPhoneNumber(raw: string): string {
  const stripped = raw.replace(/[^\d+]/g, '');
  let digits = '';
  let hasPlus = stripped.startsWith('+');

  if (hasPlus) {
    const afterPlus = stripped.slice(1);
    if (afterPlus.startsWith('33')) {
      digits = afterPlus.slice(2);
    } else if (/^[67]\d{8}$/.test(afterPlus)) {
      digits = afterPlus;
    } else {
      return raw.trim();
    }
  } else {
    digits = stripped;
    if (digits.startsWith('0') && digits.length === 10) {
      digits = digits.slice(1);
    } else if (digits.length === 9 && /^[1-9]/.test(digits)) {
      // 9 digits without leading 0 — treat as French
    } else {
      return raw.trim();
    }
  }

  if (digits.length !== 9) return raw.trim();

  const g1 = digits[0];
  const g2 = digits.slice(1, 3);
  const g3 = digits.slice(3, 5);
  const g4 = digits.slice(5, 7);
  const g5 = digits.slice(7, 9);
  return `+33 ${g1} ${g2} ${g3} ${g4} ${g5}`;
}

function formatCompanyName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trimStart()
    .split(' ')
    .map(w => w.length === 0 ? '' : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function capitalizeName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trimStart()
    .split(' ')
    .map(w => w.length === 0 ? '' : w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export default function SAProspectModal({ existing, onSave, onClose }: Props) {
  const t = useThemeTokens();
  const [form, setForm] = useState({
    manager_first_name: existing?.manager_first_name ?? '',
    manager_last_name: existing?.manager_last_name ?? '',
    nom: existing?.nom ?? '',
    site_internet: existing?.site_internet ?? '',
    lien_google_maps: existing?.lien_google_maps ?? '',
    telephone: existing?.telephone ?? '',
    adresse: existing?.adresse ?? '',
    secteur_activite: existing?.secteur_activite ?? '',
    descriptif: existing?.descriptif ?? '',
    statut: existing?.statut ?? 'Nouveau',
  });

  const update = (key: string, value: string) =>
    setForm(prev => ({
      ...prev,
      [key]: key === 'nom' ? formatCompanyName(value)
           : key === 'telephone' ? formatFrenchPhoneNumber(value)
           : (key === 'manager_first_name' || key === 'manager_last_name') ? capitalizeName(value)
           : value,
    }));

  const handleSave = () => {
    const nom = formatCompanyName(form.nom).trim();
    if (!nom) return;
    const telephone = formatFrenchPhoneNumber(form.telephone);
    onSave({ ...form, nom, telephone });
  };

  const inputStyle: React.CSSProperties = {
    background: t.input.bg,
    border: `1px solid ${t.input.border}`,
    color: t.input.text,
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      style={{ background: t.modal.overlayBg, backdropFilter: 'blur(4px)' }}
      onClick={undefined}
    >
      <div
        className="w-full max-w-[560px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: '90vh',
          background: t.modal.bg,
          border: `1px solid ${t.modal.border}`,
          boxShadow: t.modal.shadow,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <p className="text-sm font-semibold" style={{ color: t.modal.title }}>
            {existing ? 'Modifier la societe' : 'Nouvelle societe prospect'}
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium mb-1" style={{ color: t.text.tertiary }}>{f.label}</label>
              <input
                type={f.type ?? 'text'}
                value={form[f.key]}
                onChange={e => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={inputStyle}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: t.text.tertiary }}>Descriptif / notes</label>
            <textarea
              value={form.descriptif}
              onChange={e => update('descriptif', e.target.value)}
              placeholder="Notes libres..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none transition-all"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-3.5 flex-shrink-0"
          style={{ borderTop: `1px solid ${t.surface.border}` }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!form.nom.trim()}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
          >
            {existing ? 'Mettre a jour' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
