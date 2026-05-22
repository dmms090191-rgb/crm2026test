import { MessageCircle } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokens';

interface Props {
  tokens: ThemeTokens;
  subtitle: string;
  trailing?: React.ReactNode;
}

export default function ChatClientHeader({ tokens, subtitle, trailing }: Props) {
  return (
    <div className="flex items-center justify-between flex-shrink-0">
      <div>
        <h2 className="text-base md:text-xl font-bold" style={{ color: tokens.text.primary }}>Chat Client</h2>
        <p className="text-[11px] md:text-xs mt-0.5 hidden sm:block" style={{ color: tokens.text.quaternary }}>
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {trailing}
        <div
          className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(52,211,153,0.08)', boxShadow: '0 0 16px rgba(52,211,153,0.15)' }}
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );
}
