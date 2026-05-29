import { useCompanyId } from '../../../hooks/useCompanyId';
import LogoPage from '../../../components/logo/LogoPage';

export default function AdminLogoPage() {
  const companyId = useCompanyId();

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <LogoPage companyId={companyId} />
      </div>
    </div>
  );
}
