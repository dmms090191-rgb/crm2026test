import { X, Mail, Lock, Phone, User, UserPlus, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { usePinInput } from './hooks/usePinInput';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

export default function RegisterModal({ isOpen, onClose, onBackToLogin }: RegisterModalProps) {
  const tokens = useThemeTokens();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const { digits, pinRefs, handlePinInput, handlePinKeyDown, handlePinFocus } = usePinInput();
  const [showPin, setShowPin] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    const password = digits.join('');
    if (!firstName || !lastName || !email || password.length !== 6) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('registrations').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      phone,
      status: 'pending',
    });

    setLoading(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setError('Cette adresse email est déjà en cours de traitement.');
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } else {
      setSuccess(true);
    }
  };

  const pin = digits.join('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-4" style={{ backgroundColor: tokens.modal.overlayBg }}>
      <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 w-full max-w-md relative shadow-2xl overflow-x-hidden overflow-y-auto max-h-[calc(100vh-24px)]" style={{ background: tokens.modal.bg, borderColor: tokens.modal.border, borderWidth: '1px', borderStyle: 'solid' }}>
        <button
          onClick={onBackToLogin}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 sm:gap-2 transition-colors text-xs sm:text-sm font-medium"
          style={{ color: tokens.text.tertiary }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.text.secondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.text.tertiary;
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </button>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = tokens.modal.closeBtnHoverBg;
            e.currentTarget.style.color = tokens.modal.closeBtnHoverText;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = tokens.modal.closeBtnBg;
            e.currentTarget.style.color = tokens.modal.closeBtnText;
          }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-5 sm:mb-8 mt-6 sm:mt-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
            <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
            Inscription
          </h2>
          <p className="text-xs sm:text-sm mt-1.5 sm:mt-2" style={{ color: tokens.modal.subtitle }}>Créer un compte</p>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: tokens.success.bg }}>
              <CheckCircle className="w-8 h-8" style={{ color: tokens.success.text }} />
            </div>
            <p className="font-semibold text-lg mb-3" style={{ color: tokens.text.primary }}>Inscription confirmée</p>
            <p className="text-sm leading-relaxed" style={{ color: tokens.text.tertiary }}>
              Votre inscription a bien été prise en compte.<br />
              Vous serez recontacté ultérieurement.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition-all"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: tokens.modal.fieldLabel }}>Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: tokens.input.placeholder }} />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prénom"
                    className="w-full rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      backgroundColor: tokens.input.bg,
                      borderColor: tokens.input.border,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      color: tokens.input.text,
                    }}
                    onFocusCapture={(e) => {
                      e.currentTarget.style.borderColor = tokens.input.borderFocus;
                    }}
                    onBlurCapture={(e) => {
                      e.currentTarget.style.borderColor = tokens.input.border;
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: tokens.modal.fieldLabel }}>Nom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: tokens.input.placeholder }} />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nom de famille"
                    className="w-full rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      backgroundColor: tokens.input.bg,
                      borderColor: tokens.input.border,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      color: tokens.input.text,
                    }}
                    onFocusCapture={(e) => {
                      e.currentTarget.style.borderColor = tokens.input.borderFocus;
                    }}
                    onBlurCapture={(e) => {
                      e.currentTarget.style.borderColor = tokens.input.border;
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: tokens.modal.fieldLabel }}>Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: tokens.input.placeholder }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full rounded-xl pl-9 sm:pl-12 pr-3 sm:pr-4 py-3 focus:outline-none focus:ring-2 transition-all text-sm sm:text-base"
                  style={{
                    backgroundColor: tokens.input.bg,
                    borderColor: tokens.input.border,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: tokens.input.text,
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = tokens.input.borderFocus;
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = tokens.input.border;
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: tokens.input.placeholder }} />
                  <label className="text-xs sm:text-sm font-medium truncate" style={{ color: tokens.modal.fieldLabel }}>Mot de passe (6 chiffres)</label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ml-2"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {showPin ? <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                  {showPin ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <div className="flex gap-1.5 sm:gap-2 justify-center w-full max-w-[320px] mx-auto">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { pinRefs.current[i] = el; }}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinInput(i, e.target.value)}
                    onKeyDown={e => handlePinKeyDown(i, e)}
                    onFocus={() => handlePinFocus(i)}
                    className="flex-1 min-w-0 max-w-[48px] sm:max-w-[56px] aspect-[4/5] rounded-lg sm:rounded-xl text-center text-lg sm:text-xl font-bold text-white transition-all caret-transparent"
                    style={{
                      background: digit ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)',
                      border: digit ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.09)',
                      outline: 'none',
                    }}
                    onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(249,115,22,0.6)')}
                    onBlurCapture={e => (e.currentTarget.style.borderColor = digit ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.09)')}
                  />
                ))}
              </div>
              <p className="text-xs text-center mt-2" style={{ color: tokens.label.hint }}>Utilisez les flèches gauche/droite pour naviguer</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: tokens.modal.fieldLabel }}>Numéro de téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: tokens.input.placeholder }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                  className="w-full rounded-xl pl-9 sm:pl-12 pr-3 sm:pr-4 py-3 focus:outline-none focus:ring-2 transition-all text-sm sm:text-base"
                  style={{
                    backgroundColor: tokens.input.bg,
                    borderColor: tokens.input.border,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: tokens.input.text,
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = tokens.input.borderFocus;
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = tokens.input.border;
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: tokens.danger.text }}>{error}</p>
            )}

            <button
              onClick={handleRegister}
              disabled={!firstName || !lastName || !email || pin.length !== 6 || loading}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold rounded-xl transition-all shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              {loading ? 'Inscription...' : "S'INSCRIRE"}
            </button>

            <p className="text-center text-sm" style={{ color: tokens.text.quaternary }}>
              Votre demande sera examinée par un administrateur avant activation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
