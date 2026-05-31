import SiteManagerShell from './SiteManagerShell';

export default function SASiteTalvex() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col">
        <SiteManagerShell
          ownerType="super_admin"
          title="Site Talvex"
          subtitle="Gestion du site officiel de la plateforme Talvex"
        />
      </div>
    </div>
  );
}
