import { ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  onClear: () => void;
}

export default function AppUnauthorizedPage({ onClear }: Props) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <div
        className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl backdrop-blur-sm"
        style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Acces non autorise</h1>
          <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
            Votre compte ne dispose pas d'un role reconnu. Contactez l'administrateur de la plateforme.
          </p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); onClear(); }}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl transition-colors"
          style={{ background: '#334155', color: '#ffffff' }}
        >
          <LogOut className="w-4 h-4" />
          Deconnexion
        </button>
      </div>
    </div>
  );
}
