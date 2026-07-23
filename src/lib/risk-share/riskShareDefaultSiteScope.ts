export function applyRiskShareDefaultSiteScope(query: URLSearchParams, siteId: string | null) {
  if (siteId) {
    query.set("or", `(site_id.eq.${siteId},site_id.is.null)`);
    return;
  }

  query.set("site_id", "is.null");
}
