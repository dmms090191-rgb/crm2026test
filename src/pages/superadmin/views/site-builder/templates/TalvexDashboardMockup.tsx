import { Users, Calendar, MessageSquare, Zap, TrendingUp, Bell } from 'lucide-react';

const LEADS = [
  { name: 'Marie Durand', status: 'Nouveau', color: '#0ea5e9' },
  { name: 'Pierre Martin', status: 'Contacte', color: '#f59e0b' },
  { name: 'Sophie Lefebvre', status: 'Qualifie', color: '#10b981' },
  { name: 'Lucas Bernard', status: 'RDV pris', color: '#8b5cf6' },
];

const STATS = [
  { icon: <Users className="w-3.5 h-3.5" />, label: 'Leads', value: '147', change: '+12%', color: '#0ea5e9' },
  { icon: <Calendar className="w-3.5 h-3.5" />, label: 'RDV', value: '38', change: '+8%', color: '#10b981' },
  { icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Messages', value: '89', change: '+24%', color: '#f59e0b' },
  { icon: <Zap className="w-3.5 h-3.5" />, label: 'IA active', value: 'ON', change: '', color: '#8b5cf6' },
];

const NOTIFS = [
  'Nouveau lead : Marie D.',
  'RDV confirme : Pierre M.',
  'Message recu : Sophie L.',
];

const BARS = [40, 65, 45, 80, 55, 70, 90];

export default function TalvexDashboardMockup() {
  return (
    <div className="relative w-full max-w-[480px] mx-auto lg:mx-0">
      <div className="absolute -inset-8 bg-gradient-to-r from-sky-500/20 via-cyan-500/10 to-blue-600/20 blur-3xl rounded-full opacity-60" />
      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c1222]/90 backdrop-blur-xl p-3 sm:p-4 shadow-2xl shadow-sky-500/10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-white/80">Talvex Dashboard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Bell className="w-3.5 h-3.5 text-white/40" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-[#0c1222]" />
            </div>
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3">
          {STATS.map((s, i) => (
            <div key={i} className="rounded-lg p-2 bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-1 mb-1">
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-white">{s.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-[8px] sm:text-[9px] text-white/40">{s.label}</p>
                {s.change && <span className="text-[8px] text-emerald-400">{s.change}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {/* Chart */}
          <div className="col-span-3 rounded-lg p-2.5 bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] sm:text-[10px] font-semibold text-white/60">Activite</span>
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="flex items-end gap-1 h-12 sm:h-14">
              {BARS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(to top, rgba(14,165,233,0.6), rgba(6,182,212,0.2))`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="col-span-2 rounded-lg p-2.5 bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[9px] sm:text-[10px] font-semibold text-white/60 block mb-1.5">Recents</span>
            <div className="space-y-1.5">
              {NOTIFS.map((n, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-sky-400" />
                  <span className="text-[8px] sm:text-[9px] text-white/50 truncate">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leads list */}
        <div className="mt-2 rounded-lg p-2.5 bg-white/[0.03] border border-white/[0.06]">
          <span className="text-[9px] sm:text-[10px] font-semibold text-white/60 block mb-1.5">Derniers leads</span>
          <div className="space-y-1">
            {LEADS.map((l, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-sky-400/30 to-cyan-500/30 flex items-center justify-center">
                    <span className="text-[7px] font-bold text-white/70">{l.name[0]}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-white/70">{l.name}</span>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: `${l.color}15`, color: l.color }}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
