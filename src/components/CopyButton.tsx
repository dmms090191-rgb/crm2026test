import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ value, label, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!value) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  if (!value) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 shrink-0 rounded-md px-1.5 py-1 text-[11px] font-medium transition-all ${copied ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'} ${className}`}
      title={copied ? 'Copie !' : (label || 'Copier l\'email')}
      aria-label={label || 'Copier l\'email'}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied && <span className="hidden sm:inline">Copie</span>}
    </button>
  );
}
