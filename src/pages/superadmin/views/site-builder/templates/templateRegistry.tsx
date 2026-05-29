import type { ComponentType } from 'react';
import TalvexOfficialTemplate from './TalvexOfficialTemplate';
import RenewableEnergyTemplate from './RenewableEnergyTemplate';
import HeatPumpTemplate from './HeatPumpTemplate';
import FitnessTemplate from './FitnessTemplate';
import RealEstateTemplate from './RealEstateTemplate';
import RenovationTemplate from './RenovationTemplate';
import GoldBuyingTemplate from './GoldBuyingTemplate';

export interface TemplateProps {
  domainCompanyId?: string | null;
  onDomainLogin?: () => void;
}

const TEMPLATE_REGISTRY: Record<string, ComponentType<TemplateProps>> = {
  talvex_official: TalvexOfficialTemplate,
  renewable_energy: RenewableEnergyTemplate,
  heat_pump: HeatPumpTemplate,
  fitness: FitnessTemplate,
  real_estate: RealEstateTemplate,
  renovation: RenovationTemplate,
  gold_buying: GoldBuyingTemplate,
};

export function getTemplateComponent(templateKey: string): ComponentType<TemplateProps> | null {
  return TEMPLATE_REGISTRY[templateKey] ?? null;
}

export function hasTemplate(templateKey: string): boolean {
  return templateKey in TEMPLATE_REGISTRY;
}
