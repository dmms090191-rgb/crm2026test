import { useState } from 'react';
import { LayoutDashboard, LogOut, ChevronLeft, Shield, UserCog, BookOpen, Monitor, HardDriveDownload, MessageSquare, CircleUser as UserCircle, FlaskConical, Building2, Settings, Bot, Globe } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';

export type SAView = 'dashboard' | 'admins' | 'chat-admin' | 'documentation-crm' | 'system' | 'sauvegarde' | 'mon-compte' | 'tests-systeme' | 'crm-societe' | 'statuts' | 'api-ia' | 'sites';

interface SuperAdminSidebarProps {
  activeView: SAView;
  onNavigate: (view: SAView) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
}

interface NavItem {
  id: SAView;
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
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { id: 'admins', label: 'Liste admins', icon: <UserCog className="w-4 h-4" /> },
      { id: 'mon-compte', label: 'Mon compte', icon: <UserCircle className="w-4 h-4" /> },
      { id: 'crm-societe', label: 'CRM Societe', icon: <Building2 className="w-4 h-4" /> },
      { id: 'statuts', label: 'Statuts', icon: <Settings className="w-4 h-4" /> },
      { id: 'api-ia', label: 'API IA', icon: <Bot className="w-4 h-4" /> },
      { id: 'sites', label: 'Sites & Domaines', icon: <Globe className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Contact',
    items: [
      { id: 'chat-admin', label: 'Chat Admin', icon: <MessageSquare className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { id: 'documentation-crm', label: 'Documentation CRM', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
      { id: 'sauvegarde', label: 'Sauvegarde & restauration', icon: <HardDriveDownload className="w-4 h-4" /> },
      { id: 'tests-systeme', label: 'Tests Système', icon: <FlaskConical className="w-4 h-4" /> },
    ],
  },
];

export default function SuperAdminSidebar({ activeView, onNavigate, collapsed, onCollapse, onLogout }: SuperAdminSidebarProps) {
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
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 0 20px rgba(245,158,11,0.4)' }}
          >
            <Shield className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold tracking-tight truncate" style={{ color: t.sidebar.logoText }}>Super Admin</p>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: t.sidebar.logoSub }}>Plateforme SaaS</p>
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
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={item.id === 'admins' ? 'liste-admins-tab' : undefined}
      className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 mb-0.5 ${collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-[7px]'}`}
      style={{
        background: isActive ? tokens.activeItemBg : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: isActive ? tokens.activeItemText : hovered ? tokens.itemTextHover : tokens.itemText,
        boxShadow: isActive ? tokens.activeItemShadow : 'none',
      }}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span className="text-[12.5px] font-medium truncate">{item.label}</span>}
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
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`w-full flex items-center gap-2.5 rounded-lg transition-colors duration-150 ${collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-[7px]'}`}
      style={{ color: hovered ? hoverColor : color }}
    >
      {icon}
      {!collapsed && <span className="text-[12px] font-medium">{label}</span>}
    </button>
  );
}
