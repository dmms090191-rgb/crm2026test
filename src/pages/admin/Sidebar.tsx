import {
  LayoutDashboard,
  Info,
  UserPlus,
  Upload,
  Users,
  Database,
  UserCheck,
  List,
  MessageCircle,
  MessageSquare,
  Calendar,
  CalendarRange,
  CalendarCheck,
  Settings,
  BookOpen,
  Monitor,
  HardDriveDownload,
  LogOut,
  ChevronLeft,
  Hexagon,
} from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { ActiveView } from './AdminDashboard';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'vue-ensemble', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'info-admin', label: 'Info admin', icon: <Info className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Gestion des leads',
    items: [
      { id: 'inscription', label: 'Inscription', icon: <UserPlus className="w-4 h-4" /> },
      { id: 'import-leads', label: 'Import de leads', icon: <Upload className="w-4 h-4" /> },
      { id: 'ajouter-leads', label: 'Ajouter leads', icon: <Users className="w-4 h-4" /> },
      { id: 'crm', label: 'CRM', icon: <Database className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Equipe',
    items: [
      { id: 'ajouter-vendeur', label: 'Ajouter vendeur', icon: <UserCheck className="w-4 h-4" /> },
      { id: 'liste-vendeurs', label: 'Liste vendeurs', icon: <List className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Contact',
    items: [
      { id: 'chat-client', label: 'Chat Client', icon: <MessageCircle className="w-4 h-4" /> },
      { id: 'chat-vendeur', label: 'Chat Vendeur', icon: <MessageSquare className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Agenda',
    items: [
      { id: 'agenda', label: 'Agenda perso', icon: <Calendar className="w-4 h-4" /> },
      { id: 'agenda-equipe', label: 'Agenda équipe', icon: <CalendarRange className="w-4 h-4" /> },
      { id: 'propositions-rdv', label: 'Propositions RDV', icon: <CalendarCheck className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { id: 'statuts', label: 'Statuts', icon: <Settings className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { id: 'documentation-crm', label: 'Documentation CRM', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
      { id: 'sauvegarde', label: 'Sauvegarde & restauration', icon: <HardDriveDownload className="w-4 h-4" /> },
    ],
  },
];

export default function Sidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout }: SidebarProps) {
  const t = useThemeTokens();

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-full md:w-60'}`}
      style={{
        background: t.sidebar.bg,
        borderRight: `1px solid ${t.sidebar.border}`,
        backdropFilter: 'blur(16px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: `1px solid ${t.sidebar.border}` }}
      >
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 20px rgba(34,211,238,0.4)' }}>
            <Hexagon className="w-4 h-4 text-white fill-white/20" strokeWidth={2} />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold tracking-tight truncate" style={{ color: t.sidebar.logoText }}>DesignSpace3D</p>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: t.sidebar.logoSub }}>Admin Panel</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {sections.map((section, si) => (
          <div key={section.title} className={si > 0 ? 'mt-2' : ''}>
            {si > 0 && (
              <div className="mx-3 mb-4" style={{ height: '1px', background: t.sidebar.divider }} />
            )}
            {!collapsed && (
              <p className="px-2 pb-1.5 pt-1 text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: t.sidebar.sectionTitle }}>
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = activeView === item.id;
              return (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                  onClick={() => onNavigate(item.id)}
                  tokens={t.sidebar}
                />
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className="px-2 pb-2 pt-2 space-y-0.5"
        style={{ borderTop: `1px solid ${t.sidebar.divider}` }}
      >
        <SidebarBottomButton
          icon={<LogOut className="w-4 h-4 flex-shrink-0" />}
          label="Deconnexion"
          collapsed={collapsed}
          color={t.sidebar.logoutText}
          hoverColor={t.sidebar.logoutHover}
          onClick={onLogout}
        />
        <SidebarBottomButton
          icon={<ChevronLeft className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${collapsed ? 'rotate-180' : ''}`} />}
          label="Reduire"
          collapsed={collapsed}
          color={t.sidebar.collapseText}
          hoverColor={t.sidebar.collapseHover}
          onClick={onCollapse}
        />
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  isActive,
  collapsed,
  onClick,
  tokens,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
  tokens: ReturnType<typeof useThemeTokens>['sidebar'];
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`w-full flex items-center rounded-lg transition-all duration-150 group ${
        collapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3 py-2'
      }`}
      style={
        isActive
          ? {
              background: tokens.activeItemBg,
              boxShadow: tokens.activeItemShadow,
            }
          : {}
      }
    >
      <span
        className="flex-shrink-0 transition-all duration-150"
        style={{ color: isActive ? tokens.activeItemIcon : tokens.itemIcon }}
      >
        {item.icon}
      </span>
      {!collapsed && (
        <span
          className="text-sm font-medium truncate transition-colors duration-150"
          style={{ color: isActive ? tokens.activeItemText : tokens.itemText }}
        >
          {item.label}
        </span>
      )}
      {!collapsed && isActive && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm"
          style={{ background: tokens.activeItemDot, boxShadow: `0 0 6px ${tokens.activeItemDot}` }}
        />
      )}
    </button>
  );
}

function SidebarBottomButton({
  icon,
  label,
  collapsed,
  color,
  hoverColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  color: string;
  hoverColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 rounded-lg py-2 transition-all group ${collapsed ? 'px-1 justify-center' : 'px-3'}`}
      onMouseEnter={e => {
        const els = e.currentTarget.querySelectorAll<HTMLElement>('[data-themed]');
        els.forEach(el => { el.style.color = hoverColor; });
      }}
      onMouseLeave={e => {
        const els = e.currentTarget.querySelectorAll<HTMLElement>('[data-themed]');
        els.forEach(el => { el.style.color = color; });
      }}
    >
      <span data-themed style={{ color }}>
        {icon}
      </span>
      {!collapsed && <span data-themed className="text-sm font-medium transition-colors" style={{ color }}>{label}</span>}
    </button>
  );
}
