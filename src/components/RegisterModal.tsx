import { X, Mail, Lock, Phone, User, UserPlus, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

export default function RegisterModal({ isOpen, onClose, onBackToLogin }: RegisterModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinInput = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      setTimeout(() => pinRefs.current[index + 1]?.focus(), 0);
    }
  }, []);

  const handlePinKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits(prev => { const n = [...prev]; n[index] = ''; return n; });
      } else if (index > 0) {
        pinRefs.current[index - 1]?.focus();
        setDigits(prev => { const n = [...prev]; n[index - 1] = ''; return n; });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  }, [digits]);

  const handlePinFocus = useCallback((index: number) => {
    pinRefs.current[index]?.select();
  }, []);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 w-full max-w-md relative border border-slate-700 shadow-2xl">
        <button
          onClick={onBackToLogin}
          className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </button>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-slate-700/50 hover:bg-slate-600/50 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-slate-300" />
        </button>

        <div className="flex flex-col items-center mb-8 mt-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
            Inscription
          </h2>
          <p className="text-slate-400 text-sm mt-2">Créer un compte</p>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-slate-200 font-semibold text-lg mb-3">Inscription confirmée</p>
            <p className="text-slate-400 text-sm leading-relaxed">
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
                <label className="block text-slate-300 text-sm font-medium mb-2">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prénom"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Nom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nom de famille"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-12 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <label className="text-slate-300 text-sm font-medium">Mot de passe (6 chiffres)</label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPin ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <div className="flex gap-2 justify-center">
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
                    className="w-12 h-14 rounded-xl text-center text-xl font-bold text-white transition-all caret-transparent"
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
              <p className="text-xs text-slate-600 text-center mt-2">Utilisez les flèches gauche/droite pour naviguer</p>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Numéro de téléphone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-12 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              onClick={handleRegister}
              disabled={!firstName || !lastName || !email || pin.length !== 6 || loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              {loading ? 'Inscription...' : "S'INSCRIRE"}
            </button>

            <p className="text-center text-slate-500 text-sm">
              Votre demande sera examinée par un administrateur avant activation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
