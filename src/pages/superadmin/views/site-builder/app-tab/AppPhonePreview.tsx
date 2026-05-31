import { BarChart3, Users, MessageSquare, Bell } from 'lucide-react';

export default function AppPhonePreview() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div
          className="absolute -inset-3 rounded-[2.5rem] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)',
            filter: 'blur(16px)',
          }}
        />
        <div
          className="relative rounded-[2.25rem] overflow-hidden"
          style={{
            width: 280,
            height: 560,
            border: '6px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(14,165,233,0.06), inset 0 0 0 1px rgba(255,255,255,0.05)',
            background: '#0f172a',
          }}
        >
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="text-[9px] font-semibold text-white/40">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 rounded-sm bg-white/30" />
              <div className="w-3 h-1.5 rounded-sm bg-white/30" />
              <div className="w-5 h-2.5 rounded-sm border border-white/30 relative">
                <div className="absolute inset-0.5 rounded-[1px] bg-white/40" style={{ width: '60%' }} />
              </div>
            </div>
          </div>

          {/* App header */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #10b981)' }}
              >
                <span className="text-white text-sm font-bold">T</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white/90">Talvex CRM</p>
                <p className="text-[9px] text-white/40">Tableau de bord</p>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'Leads', value: '247', color: '#0ea5e9', change: '+12%' },
                { label: 'RDV', value: '38', color: '#10b981', change: '+8%' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-[9px] text-white/40 mb-1">{stat.label}</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</span>
                    <span className="text-[8px] font-semibold mb-0.5" style={{ color: '#10b981' }}>{stat.change}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity list */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-[9px] font-semibold text-white/50">Activite recente</p>
              </div>
              {[
                { name: 'Jean Dupont', action: 'Nouveau lead', time: '2 min', color: '#0ea5e9' },
                { name: 'Marie L.', action: 'RDV confirme', time: '15 min', color: '#10b981' },
                { name: 'Pierre M.', action: 'Message recu', time: '1h', color: '#f59e0b' },
                { name: 'Sophie K.', action: 'Statut mis a jour', time: '2h', color: '#06b6d4' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2.5"
                  style={{ borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                    style={{ background: `${item.color}30` }}
                  >
                    {item.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-semibold text-white/80 truncate">{item.name}</p>
                    <p className="text-[8px] text-white/35">{item.action}</p>
                  </div>
                  <span className="text-[8px] text-white/25 flex-shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom nav bar */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-4 py-3"
            style={{ background: 'rgba(15,23,42,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
          >
            {[
              { icon: BarChart3, active: true },
              { icon: Users, active: false },
              { icon: MessageSquare, active: false },
              { icon: Bell, active: false },
            ].map((nav, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <nav.icon
                  className="w-4 h-4"
                  style={{ color: nav.active ? '#0ea5e9' : 'rgba(255,255,255,0.25)' }}
                />
                {nav.active && (
                  <div className="w-1 h-1 rounded-full" style={{ background: '#0ea5e9' }} />
                )}
              </div>
            ))}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-white/15" />
        </div>
      </div>
    </div>
  );
}
