import "server-only";

import { UnknownCompanyError, getCompanyConfigByCode } from "@/lib/company";
import type { CompanyConfig } from "@/lib/company";
import type { WorkerRepresentativeConfirmationInput } from "@/lib/workerRepresentativeConfirmation";

export type WorkerRepresentativeConfirmationTenantValidationResult =
  | {
      ok: true;
      companyCode: string;
    }
  | {
      ok: false;
      reason: "company_not_found" | "risk_assessment_not_available";
    };

export async function validateWorkerRepresentativeConfirmationTenant(
  input: Pick<WorkerRepresentativeConfirmationInput, "companyCode" | "riskAssessmentId">
): Promise<WorkerRepresentativeConfirmationTenantValidationResult> {
  let company: CompanyConfig;

  try {
    company = await getCompanyConfigByCode(input.companyCode);
  } catch (error) {
    if (error instanceof UnknownCompanyError) {
      return { ok: false, reason: "company_not_found" };
    }

    throw error;
  }

  // This is intentionally a minimum tenant check: the current company configuration can
  // confirm that the tenant has a risk-assessment data source, but it cannot verify an
  // individual riskAssessmentId without querying that source.
  if (input.riskAssessmentId && !company.riskAssessmentDbId) {
    return { ok: false, reason: "risk_assessment_not_available" };
  }

  return { ok: true, companyCode: company.code };
}
