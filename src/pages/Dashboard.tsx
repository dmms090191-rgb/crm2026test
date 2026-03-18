import { Box, LogOut } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="w-full px-6 py-5 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Box className="w-9 h-9 text-blue-600" strokeWidth={2.5} />
            <span className="text-2xl font-bold text-slate-900">Novigo 3D</span>
          </div>
          <button
            onClick={onLogout}
            className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Dashboard</h1>
          <p className="text-lg text-slate-600">Bienvenue sur votre espace Novigo 3D</p>
        </div>
      </main>
    </div>
  );
}
