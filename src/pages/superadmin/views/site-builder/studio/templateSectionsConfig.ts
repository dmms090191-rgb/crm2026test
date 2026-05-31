export type { FieldType, EditableField, SectionConfig, TemplateSectionsMap } from './template-configs/templateConfigTypes';

import type { TemplateSectionsMap, SectionConfig } from './template-configs/templateConfigTypes';
import { GOLD_BUYING_SECTIONS } from './template-configs/goldBuyingConfig';
import { RENEWABLE_ENERGY_SECTIONS } from './template-configs/renewableEnergyConfig';
import { BUILDER_READY_SECTIONS } from './template-configs/builderReadyConfig';
import { GENERIC_SECTIONS } from './template-configs/genericConfig';

export const TEMPLATE_SECTIONS: TemplateSectionsMap = {
  gold_buying: GOLD_BUYING_SECTIONS,
  renewable_energy: RENEWABLE_ENERGY_SECTIONS,
  builder_ready: BUILDER_READY_SECTIONS,
  talvex_official: GENERIC_SECTIONS,
  heat_pump: GENERIC_SECTIONS,
  fitness: GENERIC_SECTIONS,
  real_estate: GENERIC_SECTIONS,
  renovation: GENERIC_SECTIONS,
};

export function getSectionsForTemplate(templateKey: string): SectionConfig[] {
  return TEMPLATE_SECTIONS[templateKey] ?? GENERIC_SECTIONS;
}
