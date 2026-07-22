import {
  getRiskShareCopy,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";

export const RISK_SHARE_PREWORK_CHECKLIST_TEMPLATE_ID =
  "risk-share-prework-core";
export const RISK_SHARE_PREWORK_CHECKLIST_TEMPLATE_VERSION = "1";

export type RiskShareChecklistTemplateSnapshot = {
  templateId: string;
  templateVersion: string;
  locale: RiskShareLocale;
  items: string[];
};

/**
 * Returns the exact checklist contract shown to a worker and later persisted
 * with the submission. Labels remain locale-specific evidence while the
 * stable id/version identifies the underlying checklist template.
 */
export function getRiskSharePreworkChecklistTemplate(
  locale: RiskShareLocale,
): RiskShareChecklistTemplateSnapshot {
  return {
    templateId: RISK_SHARE_PREWORK_CHECKLIST_TEMPLATE_ID,
    templateVersion: RISK_SHARE_PREWORK_CHECKLIST_TEMPLATE_VERSION,
    locale,
    items: [...getRiskShareCopy(locale).participation.prework.checklist],
  };
}
