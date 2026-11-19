import { useState, useRef, useEffect } from 'react';
import { UserPlus, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useCompanyId } from '../../../hooks/useCompanyId';
import { useOngletActif } from '../../../hooks/useOngletActif';
import { normalizeEmail, normalizePhone } from '../../../lib/phoneNormalizer';
import { chargerStructureOnglets, rattacherLeads } from '../../../lib/ongletsDepot';
import { ONGLET_PRINCIPAL, type Onglet } from '../../../lib/ongletsLeads';
import type { ThemeTokens } from '../../../lib/themeTokens';


const inputClass = "w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all";

function PinInput({ value, onChange, tokens }: { value: string[]; onChange: (v: string[]) => void; tokens: ThemeTokens }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [visible, setVisible] = useState(false);

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...value];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    onChange(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="flex items-center gap-2.5">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type={visible ? 'text' : 'password'}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-11 text-center text-lg font-bold rounded-xl outline-none focus:ring-2 transition-all"
          style={{
            color: tokens.text.primary,
            background: digit ? tokens.accent.bg : tokens.input.bg,
            border: digit ? `1px solid ${tokens.accent.border}` : `1px solid ${tokens.input.border}`,
            boxShadow: 'none',
            '--tw-ring-color': tokens.accent.border,
          } as React.CSSProperties}
        />
      ))}
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors ml-1"
        style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }}
        title={visible ? 'Masquer' : 'Afficher'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function FocusInput({
  type = 'text',
  placeholder,
  value,
  onChange,
  as,
  tokens,
}: {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  as?: 'input' | 'textarea';
  tokens: ThemeTokens;
}) {
  const [focused, setFocused] = useState(false);
  const style = {
    color: tokens.input.text,
    background: tokens.input.bg,
    border: focused ? `1px solid ${tokens.input.borderFocus}` : `1px solid ${tokens.input.border}`,
  };

  if (as === 'textarea') {
    return (
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={3}
        className={inputClass + ' resize-none'}
        style={style}
      />
    );
  }

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={inputClass}
      style={style}
    />
  );
}


export default function AjouterLeads() {
  const tokens = useThemeTokens();
  const companyId = useCompanyId();

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  /* L'ONGLET DE COLONNES : un lead saisi a la main rejoint l'onglet ouvert dans le CRM (case
     cochee par defaut — decision de David), ou un autre choisi ici. Il reste dans Principal. */
  const { ongletId: ongletActif } = useOngletActif(companyId);
  const [onglets, setOnglets] = useState<Onglet[]>([]);
  const [ongletCible, setOngletCible] = useState<string>('');
  const [rattacher, setRattacher] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let annule = false;
    chargerStructureOnglets(companyId).then(({ data }) => {
      if (annule || !data) return;
      setOnglets(data.onglets);
    });
    return () => { annule = true; };
  }, [companyId]);

  /* Coche par defaut SEULEMENT si le CRM est ouvert sur un onglet : depuis Principal, un lead
     saisi a la main n'a pas a atterrir dans le premier onglet venu. */
  useEffect(() => {
    const ouvert = ongletActif !== ONGLET_PRINCIPAL && onglets.some(o => o.id === ongletActif);
    setRattacher(ouvert);
    if (ouvert) setOngletCible(ongletActif);
    else if (!onglets.some(o => o.id === ongletCible)) setOngletCible(onglets[0]?.id ?? '');
  }, [ongletActif, onglets]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim()) {
      setError('Le prénom et le nom sont requis.');
      return;
    }
    /* Les colonnes PLATES sont remplies comme a l'import : c'est par elles qu'un import
       ulterieur reconnaitra ce lead comme un doublon, au lieu d'en creer un second. */
    const emailPlat = email.trim() ? normalizeEmail(email) : null;
    if (email.trim() && !emailPlat) { setError("L'adresse email n'est pas valide."); return; }
    const tel = normalizePhone(telephone);
    if (telephone.trim() && !tel.valid) { setError("Le numéro de téléphone n'est pas reconnu."); return; }

    setSaving(true);
    setError('');

    const data: Record<string, string> = {
      Prenom: prenom.trim(),
      Nom: nom.trim(),
      Email: email.trim(),
      Telephone: telephone.trim(),
      MotDePasse: pin.join(''),
    };

    const { data: cree, error: dbError } = await supabase.from('leads').insert({
      data,
      import_id: null,
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: emailPlat,
      telephone: tel.canonical,
      source: 'manuel',
      ...(companyId ? { company_id: companyId } : {}),
    }).select('id').single();

    if (dbError || !cree) {
      setSaving(false);
      setError(dbError?.code === '23505'
        ? 'Un lead avec cet email ou ce numéro existe déjà dans votre CRM.'
        : 'Une erreur est survenue. Veuillez réessayer.');
      return;
    }

    if (rattacher && ongletCible && companyId) {
      const { error: errOnglet } = await rattacherLeads(companyId, ongletCible, [cree.id]);
      if (errOnglet) setError("Lead créé, mais l'ajout à l'onglet a échoué : il est visible dans Principal.");
    }
    setSaving(false);

    setSuccess(true);
    setPrenom('');
    setNom('');
    setEmail('');
    setTelephone('');
    setPin(['', '', '', '', '', '']);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>Ajouter leads</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Ajouter leads</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: tokens.accent.bg }}
        >
          <UserPlus className="w-4 h-4" style={{ color: tokens.accent.text }} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl overflow-hidden"
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
        }}
      >
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
                Prénom <span style={{ color: tokens.danger.text }}>*</span>
              </label>
              <FocusInput placeholder="Jean" value={prenom} onChange={setPrenom} tokens={tokens} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
                Nom <span style={{ color: tokens.danger.text }}>*</span>
              </label>
              <FocusInput placeholder="Dupont" value={nom} onChange={setNom} tokens={tokens} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
              Adresse email
            </label>
            <FocusInput type="email" placeholder="jean.dupont@example.com" value={email} onChange={setEmail} tokens={tokens} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
              Téléphone
            </label>
            <FocusInput type="tel" placeholder="+33 6 00 00 00 00" value={telephone} onChange={setTelephone} tokens={tokens} />
          </div>

          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>
              Mot de passe (6 chiffres)
            </label>
            <PinInput value={pin} onChange={setPin} tokens={tokens} />
          </div>

          {onglets.length > 0 && (
            <div className="space-y-2 rounded-xl p-3" style={{ background: tokens.surface.tertiary }}>
              <label className="flex items-center gap-2 text-xs cursor-pointer min-h-[44px]" style={{ color: tokens.text.secondary }}>
                <input type="checkbox" checked={rattacher} onChange={e => setRattacher(e.target.checked)} className="w-4 h-4" />
                Ajouter aussi à l'onglet de colonnes
              </label>
              {rattacher && (
                <select value={ongletCible} onChange={e => setOngletCible(e.target.value)} aria-label="Onglet de colonnes"
                  className="w-full h-10 px-3 rounded-lg text-xs focus:outline-none"
                  style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.input.text }}>
                  {onglets.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                </select>
              )}
              <p className="text-[10px]" style={{ color: tokens.text.quaternary }}>Le lead reste toujours visible dans « Principal ».</p>
            </div>
          )}

          {error && (
            <p className="text-xs px-1" role="alert" style={{ color: tokens.danger.text }}>{error}</p>
          )}
        </div>

        <div
          className="px-6 py-4 flex items-center gap-4"
          style={{ borderTop: `1px solid ${tokens.card.border}` }}
        >
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              color: '#ffffff',
              background: tokens.accent.solid,
            }}
          >
            <UserPlus className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer le lead'}
          </button>

          {success && (
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: tokens.success.text }}>
              <Check className="w-4 h-4" />
              Lead ajouté au CRM avec succès
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
