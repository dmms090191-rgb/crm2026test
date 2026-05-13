import {
  LayoutDashboard,
  MessageCircle,
  CalendarDays,
  CalendarClock,
  LogOut,
  ChevronLeft,
  Hexagon,
} from 'lucide-react';
import type { ClientActiveView } from './ClientDashboard';
import { useThemeTokens } from '../../hooks/useThemeTokens';

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
    title: 'G\u00e9n\u00e9ral',
    items: [
      { id: 'vue-ensemble', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
  },
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
  const tokens = useThemeTokens();

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-full md:w-60'}`}
      style={{
        background: tokens.sidebar.bg,
        borderRight: `1px solid ${tokens.sidebar.border}`,
        backdropFilter: 'blur(16px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: `1px solid ${tokens.sidebar.border}` }}
      >
        <div className="relative flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg"
            style={{ boxShadow: '0 0 20px rgba(34,211,238,0.4)' }}
          >
            <Hexagon className="w-4 h-4 text-white fill-white/20" strokeWidth={2} />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold tracking-tight truncate" style={{ color: tokens.sidebar.logoText }}>DesignSpace3D</p>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: tokens.sidebar.logoSub }}>Espace Client</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sections.map((section, si) => (
          <div key={section.title}>
            {si > 0 && (
              <div className="mx-2 my-2" style={{ height: '1px', background: tokens.sidebar.divider }} />
            )}
            {!collapsed && (
              <p className="px-2 pb-1 pt-2 text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: tokens.sidebar.sectionTitle }}>
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
                          background: tokens.sidebar.activeItemBg,
                          boxShadow: tokens.sidebar.activeItemShadow,
                        }
                      : {}
                  }
                >
                  <span
                    className={`flex-shrink-0 transition-all duration-150`}
                    style={{ color: isActive ? tokens.sidebar.activeItemIcon : undefined }}
                  >
                    {!isActive && <span className="transition-colors" style={{ color: tokens.sidebar.itemIcon }}>{item.icon}</span>}
                    {isActive && item.icon}
                  </span>
                  {!collapsed && (
                    <span
                      className={`text-sm font-medium truncate transition-colors duration-150`}
                      style={{ color: isActive ? tokens.sidebar.activeItemText : undefined }}
                    >
                      {!isActive && <span className="transition-colors" style={{ color: tokens.sidebar.itemText }}>{item.label}</span>}
                      {isActive && item.label}
                    </span>
                  )}
                  {!collapsed && isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: tokens.sidebar.activeItemDot, boxShadow: `0 0 6px ${tokens.sidebar.activeItemDot}` }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className="px-2 pb-2 pt-2 space-y-0.5"
        style={{ borderTop: `1px solid ${tokens.sidebar.divider}` }}
      >
        <button
          onClick={onLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg py-2 transition-all group ${collapsed ? 'px-1 justify-center' : 'px-3'}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0 transition-colors" style={{ color: tokens.sidebar.logoutText }} />
          {!collapsed && <span className="text-sm font-medium transition-colors" style={{ color: tokens.sidebar.logoutText }}>{!collapsed && 'Déconnexion'}</span>}
        </button>
        <button
          onClick={onCollapse}
          title={collapsed ? 'Agrandir' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg py-2 transition-all group ${collapsed ? 'px-1 justify-center' : 'px-3'}`}
        >
          <ChevronLeft className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${collapsed ? 'rotate-180' : ''}`} style={{ color: tokens.sidebar.itemIcon }} />
          {!collapsed && <span className="text-sm font-medium transition-colors" style={{ color: tokens.sidebar.itemText }}>Réduire</span>}
        </button>
      </div>
    </aside>
  );
}
