import { Bell, MessageCircle, MessageSquare, ChevronRight, ArrowLeft } from 'lucide-react';

interface VendorTopBarProps {
  breadcrumb: string;
  vendorName?: string;
  isImpersonating?: boolean;
  onBackToAdmin?: () => void;
}

export default function VendorTopBar({ breadcrumb, vendorName = 'Vendeur', isImpersonating, onBackToAdmin }: VendorTopBarProps) {
  return (
    <div className="flex-shrink-0">
      {isImpersonating && (
        <div
          className="flex items-center justify-between px-6 py-2"
          style={{ background: 'rgba(52,211,153,0.08)', borderBottom: '1px solid rgba(52,211,153,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Mode admin — vous visualisez le panel de <span className="font-bold">{vendorName}</span></span>
          </div>
          <button
            onClick={onBackToAdmin}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-emerald-400 transition-all hover:scale-105"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <ArrowLeft className="w-3 h-3" />
            Retour admin
          </button>
        </div>
      )}
    <header
      className="flex items-center justify-between px-6 h-16"
      style={{
        background: 'rgba(6,9,15,0.95)',
        borderBottom: '1px solid rgba(56,189,248,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-slate-600 text-xs">Principal</span>
        <ChevronRight className="w-3 h-3 text-slate-700" />
        <span className="text-slate-200 text-sm font-semibold">{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-1">
        {[
          { label: 'Chat Admin', icon: <MessageSquare className="w-3.5 h-3.5" /> },
          { label: 'Chat Client', icon: <MessageCircle className="w-3.5 h-3.5" /> },
        ].map(({ label, icon }) => (
          <button
            key={label}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-200 transition-all group"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="text-slate-600 group-hover:text-cyan-400 transition-colors">{icon}</span>
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
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              boxShadow: '0 0 16px rgba(14,165,233,0.35)',
            }}
          >
            {vendorName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-semibold text-white leading-tight">{vendorName}</p>
            <p className="text-[9px] text-slate-600 tracking-wider uppercase">Vendeur</p>
          </div>
        </div>
      </div>
    </header>
    </div>
  );
}
