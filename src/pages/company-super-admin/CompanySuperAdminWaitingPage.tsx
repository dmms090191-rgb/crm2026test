import { useState, useEffect } from 'react';
import { Shield, LogOut, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ImpersonatedCompanySuperAdmin } from '../../App';

interface Props {
  onLogout?: () => void;
  impersonated?: ImpersonatedCompanySuperAdmin;
  onBack?: () => void;
}

export default function CompanySuperAdminWaitingPage({ onLogout, impersonated, onBack }: Props) {
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (impersonated) {
      setUserName([impersonated.first_name, impersonated.last_name].filter(Boolean).join(' '));
      setCompanyName(impersonated.company || '');
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const m = user.user_metadata ?? {};
      setUserName([m.first_name as string, m.last_name as string].filter(Boolean).join(' '));
      setCompanyName((m.company as string) || '');
    });
  }, [impersonated]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <div
        className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl backdrop-blur-sm"
        style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(245,158,11,0.15)' }}
      >
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Shield className="w-8 h-8" style={{ color: '#f59e0b' }} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Votre espace est en cours de preparation</h1>
          <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
            {impersonated
              ? 'Vous visualisez cet espace en tant que Super Admin. Son tableau de bord est en cours de configuration.'
              : 'Votre compte Super Admin est actif. Votre tableau de bord est en cours de configuration et sera disponible prochainement.'}
          </p>
        </div>

        {(userName || companyName) && (
          <div className="space-y-1 py-3 px-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
            {userName && (
              <p className="text-sm font-medium text-white">{userName}</p>
            )}
            {companyName && (
              <p className="text-xs" style={{ color: '#f59e0b' }}>{companyName}</p>
            )}
          </div>
        )}

        {impersonated && onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl transition-colors"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#ffffff' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour a la liste
          </button>
        ) : onLogout ? (
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl transition-colors"
            style={{ background: '#334155', color: '#ffffff' }}
          >
            <LogOut className="w-4 h-4" />
            Deconnexion
          </button>
        ) : null}
      </div>
    </div>
  );
}
