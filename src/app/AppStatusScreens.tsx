import { useEffect } from 'react';
import { Box, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

function isHighLevelTheme(): boolean {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'highlevel_light' || attr === 'highlevel_dark' || attr === 'highlevel_emerald';
}

export function AppLoadingScreen() {
  useEffect(() => { document.getElementById('root')?.classList.add('app-ready'); }, []);
  const hl = isHighLevelTheme();
  return (
    <div
      className="min-h-screen flex items-center justify-center transition-colors duration-200"
      style={{ background: 'inherit' }}
    >
      <div
        className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: hl ? '#2563eb' : '#0ea5e9', borderTopColor: 'transparent' }}
      />
    </div>
  );
}

export function AppAccessBlocked({ onClear }: { onClear: () => void }) {
  const hl = isHighLevelTheme();
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: hl
          ? 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      <div
        className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl backdrop-blur-sm"
        style={{
          background: hl ? 'rgba(255,255,255,0.7)' : 'rgba(30,41,59,0.6)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Box className="w-7 h-7 text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold" style={{ color: hl ? '#0f172a' : '#ffffff' }}>Acces desactive</h1>
          <p className="text-sm leading-relaxed" style={{ color: hl ? '#64748b' : '#94a3b8' }}>
            Votre acces administrateur a ete desactive. Contactez le support.
          </p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); onClear(); }}
          className="px-6 py-2.5 text-sm font-medium rounded-xl transition-colors"
          style={{
            background: hl ? '#e2e8f0' : '#334155',
            color: hl ? '#0f172a' : '#ffffff',
          }}
        >
          Deconnexion
        </button>
      </div>
    </div>
  );
}

export function AppDomainBlocked({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <div
        className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl backdrop-blur-sm"
        style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <ShieldAlert className="w-7 h-7" style={{ color: '#f59e0b' }} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Acces non autorise</h1>
          <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
            Ce compte n'est pas autorise sur ce domaine. Connectez-vous depuis le site de votre societe ou depuis la page principale Talvex.
          </p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); onClear(); }}
          className="px-6 py-2.5 text-sm font-medium rounded-xl transition-colors"
          style={{ background: '#334155', color: '#ffffff' }}
        >
          Deconnexion
        </button>
      </div>
    </div>
  );
}
