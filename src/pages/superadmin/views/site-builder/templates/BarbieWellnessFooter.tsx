
export default function BarbieWellnessFooter() {
  return (
    <>
      {/* ========== FOOTER ========== */}
      <footer className="relative" style={{ borderTop: '1px solid rgba(56,168,181,0.06)' }}>
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,168,181,0.12), rgba(111,83,98,0.08), transparent)' }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
            <div className="flex items-center gap-3">
              <img src="/logo_BW_transparent_4K.png" alt="Barbie Wellness" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
              <span className="text-sm sm:text-base font-bold tracking-tight" style={{ color: '#3d4f5a' }}>Barbie Wellness</span>
            </div>
            <p className="text-[10px] sm:text-xs tracking-widest uppercase font-medium" style={{ color: '#8ea0aa' }}>
              Bien-etre &bull; Nutrition &bull; Accompagnement
            </p>
            <div className="w-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,168,181,0.15), transparent)' }} />
            <p className="text-[11px]" style={{ color: '#a0b0b8' }}>
              &copy; {new Date().getFullYear()} Barbie Wellness. Tous droits reserves.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
