import { useState, useEffect } from 'react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import CopyButton from '../CopyButton';

/** Identite editable, commune a une Societe et a un Groupe. */
export interface DetailEntity {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company: string;
}

export interface InfoDraft {
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  /** Bascule immediate du compte Auth. Vide = inchange. */
  email: string;
}

interface Props {
  entity: DetailEntity;
  /** Libelle du champ « entreprise » : « Societe » ou « Groupe ». */
  companyLabel: string;
  /**
   * Champs que l'appelant sait REELLEMENT enregistrer. Un champ non
   * enregistrable reste affiche, en lecture seule : on ne fait jamais croire
   * a une sauvegarde qui n'aura pas lieu.
   */
  editableFields?: { company?: boolean; phone?: boolean; email?: boolean };
  /** L'appelant choisit son endpoint. Rejette avec un message en cas d'echec. */
  onSave: (draft: InfoDraft) => Promise<void>;
  onUpdate: () => void;
}

/**
 * Onglet « Informations », partage entre le detail d'une Societe et celui d'un
 * Groupe. La sauvegarde n'est PAS ici : chaque appelant fournit la sienne,
 * parce que les deux entites ne passent pas par la meme Edge Function.
 */
export default function EntityInfoTab({ entity, companyLabel, editableFields, onSave, onUpdate }: Props) {
  const tokens = useThemeTokens();
  const canEditCompany = editableFields?.company !== false;
  const canEditPhone = editableFields?.phone !== false;
  const canEditEmail = editableFields?.email === true;

  const [firstName, setFirstName] = useState(entity.first_name);
  const [lastName, setLastName] = useState(entity.last_name);
  const [company, setCompany] = useState(entity.company || '');
  const [phone, setPhone] = useState(entity.phone || '');
  const [email, setEmail] = useState(entity.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Reinitialisation quand on change D'ENTITE, pas quand la meme entite est
  // rechargee : sinon le rafraichissement declenche par l'enregistrement
  // effacerait aussitot le message de succes.
  useEffect(() => {
    setFirstName(entity.first_name);
    setLastName(entity.last_name);
    setCompany(entity.company || '');
    setPhone(entity.phone || '');
    setEmail(entity.email || '');
    setError('');
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity.id]);

  async function save() {
    // Validation minimale, alignee sur l'existant : on refuse le vide, rien de
    // plus. Aucune regle de format qui rejetterait une donnee deja en base.
    if (!firstName.trim()) { setError('Le prenom est requis.'); return; }
    if (!lastName.trim()) { setError('Le nom est requis.'); return; }
    if (canEditCompany && !company.trim()) { setError(`Le champ ${companyLabel} est requis.`); return; }
    if (canEditEmail) {
      if (!email.trim()) { setError("L'email est requis."); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Email invalide.'); return; }
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company: company.trim(),
        phone: phone.trim(),
        // Vide quand le champ n'est pas editable : l'appelant n'enverra rien.
        email: canEditEmail ? email.trim() : '',
      });
      setSaved(true);
      onUpdate();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const labelCls = 'block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5';
  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all';
  const inputStyle = {
    background: tokens.modal.fieldBg,
    border: `1px solid ${tokens.modal.fieldBorder}`,
    color: tokens.modal.fieldValue,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: tokens.modal.fieldLabel }}>Prenom</label>
          <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={{ color: tokens.modal.fieldLabel }}>Nom</label>
          <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
      </div>

      <div>
        <label className={labelCls} style={{ color: tokens.modal.fieldLabel }}>Email</label>
        <div className="flex items-center gap-1">
          <input
            type="email"
            value={canEditEmail ? email : entity.email}
            onChange={e => setEmail(e.target.value)}
            disabled={!canEditEmail}
            className={canEditEmail
              ? `flex-1 min-w-0 ${inputCls}`
              : 'flex-1 min-w-0 px-3 py-2 rounded-lg text-sm outline-none opacity-60 cursor-not-allowed'}
            style={inputStyle}
          />
          <CopyButton value={canEditEmail ? email : entity.email} label="Copier l'email" />
        </div>
        <p className="text-[10px] mt-1" style={{ color: tokens.text.tertiary }}>
          {canEditEmail
            ? "Le changement d'email prend effet immediatement : la connexion se fera avec le nouvel email et le PIN actuel."
            : 'Email non modifiable pour des raisons de securite.'}
        </p>
      </div>

      <div>
        <label className={labelCls} style={{ color: tokens.modal.fieldLabel }}>{companyLabel}</label>
        <input
          type="text" value={company} onChange={e => setCompany(e.target.value)}
          disabled={!canEditCompany}
          placeholder={`${companyLabel} / entreprise`}
          className={canEditCompany ? inputCls : `${inputCls} opacity-60 cursor-not-allowed`}
          style={inputStyle}
        />
      </div>

      <div>
        <label className={labelCls} style={{ color: tokens.modal.fieldLabel }}>Telephone</label>
        <input
          type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          disabled={!canEditPhone}
          placeholder="+33 6 12 34 56 78"
          className={canEditPhone ? inputCls : `${inputCls} opacity-60 cursor-not-allowed`}
          style={inputStyle}
        />
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save} disabled={saving}
          className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: tokens.accent.solid, color: tokens.text.primary, boxShadow: `0 0 16px ${tokens.accent.border}` }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        {saved && <p className="text-xs" style={{ color: tokens.success.text }}>Informations mises a jour.</p>}
      </div>
    </div>
  );
}
