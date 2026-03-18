import {
  MessageCircle,
  CalendarDays,
  CalendarClock,
  LogOut,
  ChevronLeft,
  Hexagon,
} from 'lucide-react';
import type { ClientActiveView } from './ClientDashboard';

interface ClientSidebarProps {
  activeView: ClientActiveView;
  onNavigate: (view: ClientActiveView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
}

interface NavItem {
  id: ClientActiveView;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: 'Communication',
    items: [
      { id: 'messagerie', label: 'Support', icon: <MessageCircle className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Rendez-vous',
    items: [
      { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-4 h-4" /> },
      { id: 'propositions-rdv', label: 'Propositions RDV', icon: <CalendarClock className="w-4 h-4" /> },
    ],
  },
];

export default function ClientSidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout }: ClientSidebarProps) {
  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
      style={{
        background: 'linear-gradient(180deg, #06090f 0%, #080d16 60%, #060a12 100%)',
        borderRight: '1px solid rgba(56,189,248,0.08)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(56,189,248,0.08)' }}
      >
        <div className="relative flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #34d399, #059669)',
              boxShadow: '0 0 20px rgba(52,211,153,0.4)',
            }}
          >
            <Hexagon className="w-4 h-4 text-white fill-white/20" strokeWidth={2} />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold text-white tracking-tight truncate">DesignSpace3D</p>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(52,211,153,0.6)' }}>Espace Client</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sections.map((section, si) => (
          <div key={section.title}>
            {si > 0 && (
              <div className="mx-2 my-2" style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />
            )}
            {!collapsed && (
              <p className="px-2 pb-1 pt-2 text-[9px] font-bold tracking-[0.18em] uppercase text-slate-600">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-lg transition-all duration-150 group ${
                    collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'
                  }`}
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(90deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.04) 100%)',
                          boxShadow: 'inset 2px 0 0 rgba(52,211,153,0.8)',
                        }
                      : {}
                  }
                >
                  <span
                    className={`flex-shrink-0 transition-all duration-150`}
                    style={{ color: isActive ? '#34d399' : undefined }}
                  >
                    {!isActive && <span className="text-slate-600 group-hover:text-slate-300 transition-colors">{item.icon}</span>}
                    {isActive && item.icon}
                  </span>
                  {!collapsed && (
                    <span
                      className={`text-sm font-medium truncate transition-colors duration-150`}
                      style={{ color: isActive ? '#6ee7b7' : undefined }}
                    >
                      {!isActive && <span className="text-slate-500 group-hover:text-slate-200 transition-colors">{item.label}</span>}
                      {isActive && item.label}
                    </span>
                  )}
                  {!collapsed && isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.8)' }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className="px-2 pb-2 pt-2 space-y-0.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <button
          onClick={onLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg py-2 transition-all group ${collapsed ? 'px-1 justify-center' : 'px-3'}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0 text-slate-600 group-hover:text-rose-400 transition-colors" />
          {!collapsed && <span className="text-sm font-medium text-slate-600 group-hover:text-rose-400 transition-colors">Déconnexion</span>}
        </button>
        <button
          onClick={onCollapse}
          title={collapsed ? 'Agrandir' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg py-2 transition-all group ${collapsed ? 'px-1 justify-center' : 'px-3'}`}
        >
          <ChevronLeft className={`w-4 h-4 flex-shrink-0 text-slate-600 group-hover:text-slate-300 transition-all duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span className="text-sm font-medium text-slate-600 group-hover:text-slate-300 transition-colors">Réduire</span>}
        </button>
      </div>
    </aside>
  );
}
