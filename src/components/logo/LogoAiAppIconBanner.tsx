import { Smartphone, Loader2 } from 'lucide-react';

interface Props {
  savingAppIcon: boolean;
  textQuaternary: string;
}

export default function LogoAiAppIconBanner({ savingAppIcon, textQuaternary }: Props) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 mx-3 mt-2 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(6,182,212,0.08))',
        border: '1px solid rgba(14,165,233,0.2)',
        boxShadow: '0 2px 12px rgba(14,165,233,0.06)',
      }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}>
        <Smartphone className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold" style={{ color: '#0284c7' }}>Selection de l'icone application</p>
        <p className="text-[9px] font-medium" style={{ color: textQuaternary }}>Cliquez sur une icone sauvegardee pour la definir comme icone de l'application</p>
      </div>
      {savingAppIcon && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: '#0ea5e9' }} />}
    </div>
  );
}
