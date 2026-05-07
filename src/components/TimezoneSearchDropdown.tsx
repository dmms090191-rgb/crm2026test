import { useState, useRef, useEffect } from 'react';
import { Search, Globe, Check, X } from 'lucide-react';
import { searchTimezones, type TzSearchResult } from '../lib/timezone';
interface TimezoneModalProps {
  open: boolean;
  currentTimezone: string;
  onSelect: (tz: string) => void;
  onClose: () => void;
}

export default function TimezoneModal({ open, currentTimezone, onSelect, onClose }: TimezoneModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TzSearchResult[]>(() => searchTimezones('', 20));
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(searchTimezones('', 20));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setResults(searchTimezones(query, 20));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden animate-[fadeScaleIn_0.2s_ease-out]"
        style={{
          background: 'linear-gradient(180deg, #0f1a2e 0%, #0a1628 100%)',
          border: '1px solid rgba(6,182,212,0.15)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(6,182,212,0.08)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              <Globe className="w-4 h-4" style={{ color: '#22d3ee' }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Fuseau horaire</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{ color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3">
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200"
            style={{
              background: 'rgba(6,182,212,0.04)',
              border: '1px solid rgba(6,182,212,0.12)',
            }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: '#22d3ee' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un pays ou une ville..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500"
              style={{ color: '#e2e8f0' }}
            />
          </div>
        </div>

        <div className="px-2 pb-2 max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(6,182,212,0.2) transparent' }}>
          {results.map(r => {
            const isActive = r.timezone === currentTimezone;
            return (
              <button
                key={r.timezone}
                onClick={() => onSelect(r.timezone)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150"
                style={{
                  color: isActive ? '#22d3ee' : '#cbd5e1',
                  background: isActive ? 'rgba(6,182,212,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(6,182,212,0.15)' : '1px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                <Globe className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#22d3ee' : '#475569' }} />
                <div className="flex-1 text-left min-w-0">
                  <span className="font-medium">{r.country}</span>
                  <span className="mx-1.5 opacity-30">/</span>
                  <span className="opacity-60">{r.city}</span>
                </div>
                <span className="text-[11px] font-mono opacity-40 flex-shrink-0">{r.utcOffset}</span>
                {isActive && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(6,182,212,0.15)' }}
                  >
                    <Check className="w-3 h-3" style={{ color: '#22d3ee' }} />
                  </div>
                )}
              </button>
            );
          })}
          {results.length === 0 && (
            <p className="px-4 py-8 text-sm text-center" style={{ color: '#64748b' }}>Aucun resultat</p>
          )}
        </div>
      </div>
    </div>
  );
}
