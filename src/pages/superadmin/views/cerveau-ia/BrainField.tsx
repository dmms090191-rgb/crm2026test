interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  tokens: Record<string, any>;
}

export function BrainInput({ label, value, onChange, placeholder, type = 'text', tokens: t }: InputProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: t.text.secondary }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
        style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
      />
    </div>
  );
}

interface TextareaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  tokens: Record<string, any>;
  hint?: string;
}

export function BrainTextarea({ label, value, onChange, placeholder, rows = 5, tokens: t, hint }: TextareaProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: t.text.secondary }}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all resize-none"
        style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
      />
      {hint && <p className="text-[10px] mt-1" style={{ color: t.text.quaternary }}>{hint}</p>}
    </div>
  );
}
