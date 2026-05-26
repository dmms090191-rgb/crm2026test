import { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface Props {
  companyId: string;
  enabled: boolean;
  onToggled: () => void;
}

export default function SAAdminsAiSwitch({ companyId, enabled, onToggled }: Props) {
  const [loading, setLoading] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  useEffect(() => { setLocalEnabled(enabled); }, [enabled]);

  async function toggle() {
    if (loading || !companyId) return;
    setLoading(true);
    try {
      const newVal = !localEnabled;
      const { error } = await supabase
        .from('companies')
        .update({ sa_chat_ai_enabled: newVal })
        .eq('id', companyId);
      if (!error) {
        setLocalEnabled(newVal);
        onToggled();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!companyId) return <span className="text-[10px] text-gray-400">--</span>;

  return (
    <div className="flex items-center gap-1.5">
      <Bot className="w-3.5 h-3.5" style={{ color: localEnabled ? '#0ea5e9' : '#9ca3af' }} />
      <button
        onClick={toggle}
        disabled={loading}
        title={localEnabled ? 'IA activee' : 'IA desactivee'}
        className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
        style={{ background: localEnabled ? '#0ea5e9' : '#6b7280' }}
      >
        <span
          className="inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: localEnabled ? 'translateX(17px)' : 'translateX(3px)' }}
        />
      </button>
    </div>
  );
}
