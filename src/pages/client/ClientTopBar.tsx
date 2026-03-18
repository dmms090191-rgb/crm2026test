import { Bell, MessageCircle, CalendarCheck, ChevronRight } from 'lucide-react';

interface ClientTopBarProps {
  breadcrumb: string;
  clientName?: string;
}

export default function ClientTopBar({ breadcrumb, clientName = 'Client' }: ClientTopBarProps) {
  return (
    <header
      className="flex items-center justify-between px-6 h-16 flex-shrink-0"
      style={{
        background: 'rgba(6,9,15,0.95)',
        borderBottom: '1px solid rgba(56,189,248,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-slate-600 text-xs">Espace Client</span>
        <ChevronRight className="w-3 h-3 text-slate-700" />
        <span className="text-slate-200 text-sm font-semibold">{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-1">
        {[
          { label: 'Messages', icon: <MessageCircle className="w-3.5 h-3.5" /> },
          { label: 'Rendez-vous', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
        ].map(({ label, icon }) => (
          <button
            key={label}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-200 transition-all group"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="text-slate-600 group-hover:text-emerald-400 transition-colors">{icon}</span>
            <span className="text-xs font-medium hidden lg:block">{label}</span>
            <Bell className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
          </button>
        ))}

        <div
          className="flex items-center gap-2.5 ml-2 pl-4"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
              boxShadow: '0 0 16px rgba(52,211,153,0.35)',
            }}
          >
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-semibold text-white leading-tight">{clientName}</p>
            <p className="text-[9px] text-slate-600 tracking-wider uppercase">Client</p>
          </div>
        </div>
      </div>
    </header>
  );
}
