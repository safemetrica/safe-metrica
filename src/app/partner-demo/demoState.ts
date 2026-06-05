export type DemoState = {
  tbmConfirmed: boolean;
  riskSharedConfirmed: boolean;
  workerReportSubmitted: boolean;
  managerTbmStarted: boolean;
  managerActionPhotoSaved: boolean;
  managerBriefingChecked: boolean;
  ceoDashboardViewed: boolean;
  monthlyReportViewed: boolean;
  unresolvedIssues: number;
  shareConfirmRate: number;
  tbmCount: number;
};

export const demoStateKey = "safeMetricaPartnerDemoStateV1";

export const defaultDemoState: DemoState = {
  tbmConfirmed: false,
  riskSharedConfirmed: false,
  workerReportSubmitted: false,
  managerTbmStarted: false,
  managerActionPhotoSaved: false,
  managerBriefingChecked: false,
  ceoDashboardViewed: false,
  monthlyReportViewed: false,
  unresolvedIssues: 2,
  shareConfirmRate: 94,
  tbmCount: 47,
};

export function readDemoState(): DemoState {
  if (typeof window === "undefined") {
    return defaultDemoState;
  }

  const savedState = window.localStorage.getItem(demoStateKey);

  if (!savedState) {
    return defaultDemoState;
  }

  try {
    return { ...defaultDemoState, ...JSON.parse(savedState) };
  } catch {
    return defaultDemoState;
  }
}

export function writeDemoState(nextState: DemoState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(demoStateKey, JSON.stringify(nextState));
}
