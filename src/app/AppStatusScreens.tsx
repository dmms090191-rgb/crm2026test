import { Box } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function AppAccessBlocked({ onClear }: { onClear: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border border-red-500/20 bg-slate-800/60 backdrop-blur-sm">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Box className="w-7 h-7 text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Acces desactive</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Votre acces administrateur a ete desactive. Contactez le support.
          </p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); onClear(); }}
          className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Deconnexion
        </button>
      </div>
    </div>
  );
}
