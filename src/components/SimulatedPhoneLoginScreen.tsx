import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

interface Props {
  appIconUrl: string | null;
  onLogin: () => void;
  onBack?: () => void;
}

export default function SimulatedPhoneLoginScreen({ appIconUrl, onLogin, onBack }: Props) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!email || pin.length < 4) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 800);
  };

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #050810 0%, #0a1628 50%, #050810 100%)' }}
    >
      {/* Back button */}
      {onBack && (
        <div className="flex-shrink-0 pt-2 px-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">Retour</span>
          </button>
        </div>
      )}

      {/* Header with icon */}
      <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-4 px-4">
        {appIconUrl ? (
          <img
            src={appIconUrl}
            alt="Talvex"
            className="w-14 h-14 rounded-2xl object-cover mb-3"
            style={{ boxShadow: '0 6px 24px rgba(14,165,233,0.3), 0 2px 6px rgba(0,0,0,0.3)' }}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
              boxShadow: '0 6px 24px rgba(14,165,233,0.3), 0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            <span className="text-white text-2xl font-bold">T</span>
          </div>
        )}
        <h1 className="text-lg font-bold text-white mb-0.5">Connexion</h1>
        <p className="text-[10px] text-slate-400">Accedez a votre espace Talvex</p>
      </div>

      {/* Form card */}
      <div className="flex-1 px-3 pb-4">
        <div
          className="w-full rounded-2xl p-4"
          style={{
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="space-y-3.5">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-medium mb-1.5 text-slate-300">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full rounded-lg pl-8 pr-3 py-2.5 text-[11px] text-white placeholder-slate-500 focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(14,165,233,0.5)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <label className="text-[10px] font-medium text-slate-300">Mot de passe</label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {showPin ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                  {showPin ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="******"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full rounded-lg pl-8 pr-3 py-2.5 text-[11px] text-white placeholder-slate-500 focus:outline-none transition-all tracking-widest"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(14,165,233,0.5)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-[10px] text-center text-red-400">{error}</p>
            )}

            {/* Login button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 text-white text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{
                background: (!email || pin.length < 4)
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #0ea5e9, #10b981)',
                boxShadow: (!email || pin.length < 4)
                  ? 'none'
                  : '0 4px 16px rgba(14,165,233,0.25)',
              }}
            >
              <LogIn className="w-3.5 h-3.5" />
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            {/* Register link */}
            <button
              className="w-full text-[10px] font-medium flex items-center justify-center gap-1.5 text-slate-400"
              onClick={(e) => e.preventDefault()}
            >
              <UserPlus className="w-3 h-3" />
              S'inscrire
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-[8px] text-slate-600">&copy; 2026 Talvex</p>
        </div>
      </div>
    </div>
  );
}
