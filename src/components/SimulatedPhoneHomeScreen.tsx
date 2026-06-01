interface Props {
  appIconUrl: string | null;
  appName?: string;
  onOpenApp: () => void;
}

export default function SimulatedPhoneHomeScreen({ appIconUrl, appName, onOpenApp }: Props) {
  const displayName = appName ?? 'Talvex';
  const initial = displayName.charAt(0).toUpperCase() || 'T';

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center select-none"
      style={{
        background: 'linear-gradient(180deg, #0c1222 0%, #162036 40%, #0c1222 100%)',
      }}
    >
      {/* Wallpaper ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(14,165,233,0.06) 0%, transparent 70%)',
        }}
      />

      {/* App icon grid area */}
      <div className="relative flex flex-col items-center gap-2 cursor-pointer group" onClick={onOpenApp}>
        {/* Icon */}
        <div className="relative transition-transform duration-150 group-active:scale-90">
          {appIconUrl ? (
            <img
              src={appIconUrl}
              alt={displayName}
              className="w-[52px] h-[52px] rounded-[14px] object-cover"
              style={{
                boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)',
              }}
            />
          ) : (
            <div
              className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
                boxShadow: '0 4px 16px rgba(14,165,233,0.35), 0 1px 4px rgba(0,0,0,0.3)',
              }}
            >
              <span className="text-white text-xl font-bold">{initial}</span>
            </div>
          )}
        </div>
        {/* Label */}
        <span
          className="text-[9px] font-medium text-center leading-tight max-w-[64px] truncate"
          style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
        >
          {displayName}
        </span>
      </div>

      {/* Dock bar */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {[
          { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', icon: 'phone' },
          { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', icon: 'message' },
          { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: 'camera' },
        ].map((item, i) => (
          <div
            key={i}
            className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center"
            style={{ background: item.bg, opacity: 0.7 }}
          >
            <div className="w-3.5 h-3.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.5)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
