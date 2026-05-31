import { useCompanyId } from '../../../hooks/useCompanyId';
import SiteManagerShell from '../../superadmin/views/site-builder/SiteManagerShell';

export default function AdminSite() {
  const companyId = useCompanyId();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col">
        <SiteManagerShell
          ownerType="admin_company"
          title="Site"
          subtitle="Gerez le site public de votre societe"
          companyId={companyId}
        />
      </div>
    </div>
  );
}
