/** Keyframes et classes utilitaires du template. Extrait tel quel, aucun changement. */
export default function BarbieWellnessStyles() {
  return (
      <style>{`
        @keyframes bw-aurora {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.45; }
          33% { transform: translate(30px, -20px) scale(1.1) rotate(2deg); opacity: 0.6; }
          66% { transform: translate(-20px, 15px) scale(0.95) rotate(-1deg); opacity: 0.4; }
          100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.45; }
        }
        @keyframes bw-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes bw-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes bw-fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bw-shimmer {
          0% { transform: translateX(-100%) rotate(15deg); }
          100% { transform: translateX(100%) rotate(15deg); }
        }
        @keyframes bw-halo-breathe {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.06); }
        }
        @keyframes bw-iridescent {
          0% { opacity: 0.12; filter: hue-rotate(0deg); }
          50% { opacity: 0.2; filter: hue-rotate(8deg); }
          100% { opacity: 0.12; filter: hue-rotate(0deg); }
        }
        .bw-animate-in { animation: bw-fade-up 0.8s ease-out both; }
        .bw-animate-in-d1 { animation: bw-fade-up 0.8s ease-out 0.1s both; }
        .bw-animate-in-d2 { animation: bw-fade-up 0.8s ease-out 0.2s both; }
        .bw-animate-in-d3 { animation: bw-fade-up 0.8s ease-out 0.3s both; }
        .bw-animate-in-d4 { animation: bw-fade-up 0.8s ease-out 0.4s both; }
        .bw-glass {
          background: rgba(255,255,255,0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(56,168,181,0.15);
          box-shadow: 0 4px 24px rgba(56,168,181,0.06), 0 1px 0 rgba(255,255,255,0.5) inset;
        }
        .bw-glass-hover:hover {
          background: rgba(255,255,255,0.55);
          border-color: rgba(56,168,181,0.25);
          box-shadow: 0 8px 32px rgba(56,168,181,0.1), 0 1px 0 rgba(255,255,255,0.6) inset;
        }
        .bw-gradient-text {
          background: linear-gradient(135deg, #2a9aa8, #8e6878, #38A8B5);
          background-size: 200% 200%;
          animation: bw-gradient-shift 5s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .bw-btn-primary {
          background: linear-gradient(135deg, #38A8B5, #7a5d6b, #38A8B5);
          background-size: 200% 200%;
          animation: bw-gradient-shift 5s ease infinite;
          box-shadow: 0 4px 24px rgba(56,168,181,0.25), 0 2px 8px rgba(111,83,98,0.15);
          position: relative;
          overflow: hidden;
        }
        .bw-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: bw-shimmer 3s ease-in-out infinite;
        }
        .bw-btn-primary:hover {
          box-shadow: 0 8px 40px rgba(56,168,181,0.35), 0 4px 16px rgba(111,83,98,0.2);
          transform: translateY(-2px);
        }
        .bw-input {
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(56,168,181,0.12);
          color: #3d4f5a;
        }
        .bw-input::placeholder { color: rgba(111,83,98,0.4); }
        .bw-input:focus {
          border-color: rgba(56,168,181,0.4);
          background: rgba(255,255,255,0.65);
          box-shadow: 0 0 20px rgba(56,168,181,0.08);
          outline: none;
        }
      `}</style>
  );
}
