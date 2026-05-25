import SiteManagerShell from './SiteManagerShell';

export default function SASiteTalvex() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <SiteManagerShell
          ownerType="super_admin"
          title="Site Talvex"
          subtitle="Gestion du site officiel de la plateforme Talvex"
        />
      </div>
    </div>
  );
}
