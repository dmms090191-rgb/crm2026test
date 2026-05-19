import { MessageSquare } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokens';

interface Props {
  tokens: ThemeTokens;
}

export default function ChatVendeurHeader({ tokens }: Props) {
  return (
    <div className="flex items-center justify-between flex-shrink-0">
      <div>
        <h2 className="text-base md:text-xl font-bold" style={{ color: tokens.text.primary }}>Chat Vendeurs</h2>
        <p className="text-[11px] md:text-xs mt-0.5 hidden sm:block" style={{ color: tokens.text.quaternary }}>Chat avec les vendeurs</p>
      </div>
      <div
        className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(34,211,238,0.08)', boxShadow: '0 0 16px rgba(34,211,238,0.15)' }}
      >
        <MessageSquare className="w-4 h-4 text-cyan-400" />
      </div>
    </div>
  );
}
