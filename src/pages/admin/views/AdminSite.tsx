import { useCompanyId } from '../../../hooks/useCompanyId';
import SiteManagerShell from '../../superadmin/views/site-builder/SiteManagerShell';

export default function AdminSite() {
  const companyId = useCompanyId();

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
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
