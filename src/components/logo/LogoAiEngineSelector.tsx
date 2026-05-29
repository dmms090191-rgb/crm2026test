import { Zap, Settings2 } from 'lucide-react';
import type { Engine } from './logoAiConstants';

interface Props {
  engine: Engine;
  setEngine: (e: Engine) => void;
  btnStyle: (active: boolean) => React.CSSProperties;
  labelColor: string;
}

export default function LogoAiEngineSelector({ engine, setEngine, btnStyle, labelColor }: Props) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: labelColor }}>Moteur</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEngine('v4_1')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
          style={btnStyle(engine === 'v4_1')}
        >
          <Zap className="w-3.5 h-3.5" />
          V4.1 Vector
          <span
            className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
            style={{
              background: engine === 'v4_1' ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.05)',
              color: engine === 'v4_1' ? '#d97706' : 'inherit',
              opacity: engine === 'v4_1' ? 1 : 0.5,
            }}
          >
            Recommande
          </span>
        </button>
        <button
          type="button"
          onClick={() => setEngine('v3')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
          style={btnStyle(engine === 'v3')}
        >
          <Settings2 className="w-3.5 h-3.5" />
          V3 Vector
          <span
            className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
            style={{ background: 'rgba(0,0,0,0.05)', opacity: 0.5 }}
          >
            Avance
          </span>
        </button>
      </div>
    </div>
  );
}
