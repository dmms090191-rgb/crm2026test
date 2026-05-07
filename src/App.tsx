import { useState, useEffect, lazy, Suspense } from 'react';
import { LogIn, Box } from 'lucide-react';
import LoginModal from './components/LoginModal';
import type { ImpersonatedVendor } from './pages/vendor/VendorDashboard';
import type { ImpersonatedClientInfo } from './pages/client/ClientDashboard';
import { supabase } from './lib/supabase';
import { TimezoneProvider } from './contexts/TimezoneContext';
import { ThemeProvider } from './contexts/ThemeContext';

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const VendorDashboard = lazy(() => import('./pages/vendor/VendorDashboard'));
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));

type UserRole = 'admin' | 'vendor' | 'client' | null;

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedVendor, setImpersonatedVendor] = useState<ImpersonatedVendor | null>(null);
  const [impersonatedClient, setImpersonatedClient] = useState<ImpersonatedClientInfo | null>(null);

  async function detectRole() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setRole(null);
      setLoading(false);
      return;
    }
    const appRole = session.user.app_metadata?.role;
    if (appRole === 'vendor') setRole('vendor');
    else if (appRole === 'client') setRole('client');
    else setRole('admin');
    setLoading(false);
  }

  useEffect(() => {
    detectRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setRole(null);
      } else {
        const appRole = session.user.app_metadata?.role;
        if (appRole === 'vendor') setRole('vendor');
        else if (appRole === 'client') setRole('client');
        else setRole('admin');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    detectRole();
    setIsModalOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setImpersonatedVendor(null);
    setImpersonatedClient(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const suspenseFallback = (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (role === 'client') {
    return (
      <ThemeProvider panelRole="client">
        <TimezoneProvider panelRole="client">
          <Suspense fallback={suspenseFallback}>
            <ClientDashboard onLogout={handleLogout} />
          </Suspense>
        </TimezoneProvider>
      </ThemeProvider>
    );
  }

  if (role === 'vendor' && impersonatedClient) {
    return (
      <ThemeProvider panelRole="client" effectiveUserId={impersonatedClient.id}>
        <TimezoneProvider panelRole="client">
          <Suspense fallback={suspenseFallback}>
            <ClientDashboard
              onLogout={handleLogout}
              impersonatedClient={impersonatedClient}
              onBackToAdmin={() => setImpersonatedClient(null)}
              backLabel="Retour vendeur"
            />
          </Suspense>
        </TimezoneProvider>
      </ThemeProvider>
    );
  }

  if (role === 'vendor') {
    return (
      <ThemeProvider panelRole="vendor">
        <TimezoneProvider panelRole="vendor">
          <Suspense fallback={suspenseFallback}>
            <VendorDashboard
              onLogout={handleLogout}
              onConnectAsClient={(client) => setImpersonatedClient(client)}
            />
          </Suspense>
        </TimezoneProvider>
      </ThemeProvider>
    );
  }

  if (role === 'admin' && impersonatedVendor && impersonatedClient) {
    return (
      <ThemeProvider panelRole="client" effectiveUserId={impersonatedClient.id}>
        <TimezoneProvider panelRole="client">
          <Suspense fallback={suspenseFallback}>
            <ClientDashboard
              onLogout={handleLogout}
              impersonatedClient={impersonatedClient}
              onBackToAdmin={() => setImpersonatedClient(null)}
              backLabel="Retour vendeur"
            />
          </Suspense>
        </TimezoneProvider>
      </ThemeProvider>
    );
  }

  if (role === 'admin' && impersonatedClient) {
    return (
      <ThemeProvider panelRole="client" effectiveUserId={impersonatedClient.id}>
        <TimezoneProvider panelRole="client">
          <Suspense fallback={suspenseFallback}>
            <ClientDashboard
              onLogout={handleLogout}
              impersonatedClient={impersonatedClient}
              onBackToAdmin={() => setImpersonatedClient(null)}
            />
          </Suspense>
        </TimezoneProvider>
      </ThemeProvider>
    );
  }

  if (role === 'admin' && impersonatedVendor) {
    return (
      <ThemeProvider panelRole="vendor" effectiveUserId={impersonatedVendor.auth_user_id ?? impersonatedVendor.id}>
        <TimezoneProvider panelRole="vendor">
          <Suspense fallback={suspenseFallback}>
            <VendorDashboard
              onLogout={handleLogout}
              impersonatedVendor={impersonatedVendor}
              onBackToAdmin={() => setImpersonatedVendor(null)}
              onConnectAsClient={(client) => setImpersonatedClient(client)}
            />
          </Suspense>
        </TimezoneProvider>
      </ThemeProvider>
    );
  }

  if (role === 'admin') {
    return (
      <ThemeProvider panelRole="admin">
        <TimezoneProvider panelRole="admin">
          <Suspense fallback={suspenseFallback}>
            <AdminDashboard
              onLogout={handleLogout}
              onConnectAsVendor={(vendor) => setImpersonatedVendor({
                id: vendor.id,
                first_name: vendor.first_name,
                last_name: vendor.last_name,
                auth_user_id: vendor.auth_user_id,
              })}
              onConnectAsClient={(client) => setImpersonatedClient(client)}
            />
          </Suspense>
        </TimezoneProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider panelRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col overflow-x-hidden">
        <header className="w-full px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-700/50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Box className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-white">Novigo 3D</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-200 flex items-center gap-2 flex-shrink-0"
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
          <div className="max-w-4xl w-full text-center space-y-5 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full text-xs sm:text-sm font-medium">
              <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Intelligence Artificielle
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Concevez votre maison
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400 mt-1 sm:mt-2">
                en 3D
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-400 leading-relaxed px-2 sm:px-0">
              Novigo 3D est une plateforme innovante qui vous permet de concevoir et visualiser votre maison ou appartement en 3D grâce à l'intelligence artificielle. Transformez vos idées en réalité.
            </p>

            <div className="pt-4 sm:pt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="group px-7 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-base sm:text-lg font-semibold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-200 flex items-center gap-2 sm:gap-3 mx-auto"
              >
                <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                Connexion
              </button>
            </div>
          </div>
        </main>

        <footer className="py-4 sm:py-6 text-center text-xs sm:text-sm text-slate-500 px-4">
          &copy; 2026 Novigo 3D. Tous droits r&eacute;serv&eacute;s.
        </footer>
      </div>

      <LoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLogin={handleLogin}
      />
    </ThemeProvider>
  );
}

export default App;
