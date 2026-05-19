import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

interface Props {
  adminId: string;
  enabled: boolean;
  onToggled: () => void;
}

export default function SAAdminsAccessSwitch({ adminId, enabled, onToggled }: Props) {
  const [loading, setLoading] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  useEffect(() => { setLocalEnabled(enabled); }, [enabled]);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-admin-access`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ admin_id: adminId, access_enabled: !localEnabled }),
        }
      );

      if (res.ok) {
        setLocalEnabled(!localEnabled);
        onToggled();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={localEnabled ? 'Acces autorise' : 'Acces bloque'}
      className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
      style={{ background: localEnabled ? '#22c55e' : '#6b7280' }}
    >
      <span
        className="inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: localEnabled ? 'translateX(17px)' : 'translateX(3px)' }}
      />
    </button>
  );
}
