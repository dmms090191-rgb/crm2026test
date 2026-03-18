import { useState, useEffect } from 'react';
import { LogIn, Box } from 'lucide-react';
import LoginModal from './components/LoginModal';
import AdminDashboard from './pages/admin/AdminDashboard';
import VendorDashboard, { type ImpersonatedVendor } from './pages/vendor/VendorDashboard';
import ClientDashboard, { type ImpersonatedClientInfo } from './pages/client/ClientDashboard';
import { supabase } from './lib/supabase';

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

  if (role === 'client') {
    return <ClientDashboard onLogout={handleLogout} />;
  }

  if (role === 'vendor' && impersonatedClient) {
    return (
      <ClientDashboard
        onLogout={handleLogout}
        impersonatedClient={impersonatedClient}
        onBackToAdmin={() => setImpersonatedClient(null)}
        backLabel="Retour vendeur"
      />
    );
  }

  if (role === 'vendor') {
    return (
      <VendorDashboard
        onLogout={handleLogout}
        onConnectAsClient={(client) => setImpersonatedClient(client)}
      />
    );
  }

  if (role === 'admin' && impersonatedVendor && impersonatedClient) {
    return (
      <ClientDashboard
        onLogout={handleLogout}
        impersonatedClient={impersonatedClient}
        onBackToAdmin={() => setImpersonatedClient(null)}
        backLabel="Retour vendeur"
      />
    );
  }

  if (role === 'admin' && impersonatedClient) {
    return (
      <ClientDashboard
        onLogout={handleLogout}
        impersonatedClient={impersonatedClient}
        onBackToAdmin={() => setImpersonatedClient(null)}
      />
    );
  }

  if (role === 'admin' && impersonatedVendor) {
    return (
      <VendorDashboard
        onLogout={handleLogout}
        impersonatedVendor={impersonatedVendor}
        onBackToAdmin={() => setImpersonatedVendor(null)}
        onConnectAsClient={(client) => setImpersonatedClient(client)}
      />
    );
  }

  if (role === 'admin') {
    return (
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
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
        <header className="w-full px-6 py-5 border-b border-slate-700/50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Box className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold text-white">Novigo 3D</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-4xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full text-sm font-medium mb-4">
              <Box className="w-4 h-4" />
              Intelligence Artificielle
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Concevez votre maison
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400 mt-2">
                en 3D
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 leading-relaxed">
              Novigo 3D est une plateforme innovante qui vous permet de concevoir et visualiser votre maison ou appartement en 3D grâce à l'intelligence artificielle. Transformez vos idées en réalité.
            </p>

            <div className="pt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="group px-10 py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-lg font-semibold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-200 flex items-center gap-3 mx-auto"
              >
                <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                Connexion
              </button>
            </div>
          </div>
        </main>

        <footer className="py-6 text-center text-sm text-slate-500">
          © 2026 Novigo 3D. Tous droits réservés.
        </footer>
      </div>

      <LoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLogin={handleLogin}
      />
    </>
  );
}

export default App;
