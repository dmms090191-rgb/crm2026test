import { FileText } from 'lucide-react';
import type { getThemeTokens } from '../../lib/themeTokens';
import AudioPlayer from './AudioPlayer';

export default function FilePreview({ url, name, type, tokens, isOwn, accentRgb }: { url: string; name: string; type?: string | null; tokens: ReturnType<typeof getThemeTokens>; isOwn?: boolean; accentRgb?: string }) {
  if (type === 'audio') {
    return <AudioPlayer url={url} name={name} tokens={tokens} isOwn={isOwn} accentRgb={accentRgb} />;
  }
  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img
          src={url}
          alt={name}
          className="max-w-[200px] max-h-[160px] rounded-xl object-cover hover:opacity-90 transition-opacity"
          style={{ border: `1px solid ${tokens.chat.border}` }}
        />
        <span className="text-[10px] opacity-60 mt-0.5 block truncate max-w-[200px]">{name}</span>
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl hover:opacity-80 transition-opacity"
      style={{ background: tokens.chat.inputBg, border: `1px solid ${tokens.chat.border}` }}
    >
      <FileText className="w-4 h-4 flex-shrink-0" style={{ color: tokens.text.secondary }} />
      <span className="text-xs truncate max-w-[160px]" style={{ color: tokens.text.secondary }}>{name}</span>
    </a>
  );
}
