import { useCompanyId } from '../../../hooks/useCompanyId';
import LogoPage from '../../../components/logo/LogoPage';

interface Props {
  isSAViewing?: boolean;
}

export default function AdminLogoPage({ isSAViewing }: Props) {
  const companyId = useCompanyId();

  return (
    <div className="p-2 sm:p-3 md:p-4 flex flex-col h-full min-h-0">
      <LogoPage companyId={companyId} isSAViewing={isSAViewing} />
    </div>
  );
}
