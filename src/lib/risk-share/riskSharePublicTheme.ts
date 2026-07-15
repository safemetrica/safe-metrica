export type RiskSharePublicTheme = "light" | "dark";

/**
 * Public risk-share flows share one localStorage key across all six routes
 * (field + the four RiskSharePublicShell-based screens), so a theme choice
 * made on any one QR screen carries over to the others.
 */
export const RISK_SHARE_PUBLIC_THEME_STORAGE_KEY = "sm-risk-share-public-theme";

/**
 * Set on document.documentElement by the root layout's pre-paint init
 * script -- this is the SSOT Public QR CSS should read. Namespaced so it can
 * never collide with another screen's own theme attribute: manager, monthly,
 * and login all scope their own data-theme to a local .rsx-shell element
 * instead of the document root (see LoginThemeProvider's doc comment), and
 * nothing outside riskSharePublicShell.css reads this attribute.
 */
export const RISK_SHARE_PUBLIC_THEME_HTML_ATTR = "data-risk-share-public-theme";

/** RiskSharePublicShell's wrapper id (participation/anonymous/visitor/representative). */
export const RISK_SHARE_PUBLIC_SHELL_ROOT_ID = "rsx-pub-root";

/** The field page's own .rsx-shell root id (src/app/risk-share/field/page.tsx). */
export const RISK_SHARE_FIELD_ROOT_ID = "rsx-field-root";

/**
 * Source for the app's single next/script(beforeInteractive) tag, rendered
 * in the root layout (src/app/layout.tsx) -- Next.js only supports
 * `beforeInteractive` there, so this is the one place in the app allowed to
 * seed a pre-paint theme. Runs on every route; it is a no-op outside the
 * public risk-share flows since document.documentElement's attribute is
 * only ever read by riskSharePublicShell.css, and both getElementById
 * lookups miss on every other route.
 *
 * Sets the theme on document.documentElement (the SSOT), and also seeds
 * whichever public-flow root element is present (RISK_SHARE_PUBLIC_SHELL_ROOT_ID
 * or RISK_SHARE_FIELD_ROOT_ID -- never both on the same page) for backward
 * compatibility with the field page's [data-theme] CSS, which lives in the
 * designer.css also shared by manager/monthly/login and must not be
 * rewritten to key off the document root instead.
 */
export function buildRiskSharePublicThemeInitScript() {
  return `(function(){try{var k=${JSON.stringify(
    RISK_SHARE_PUBLIC_THEME_STORAGE_KEY,
  )};var a=${JSON.stringify(
    RISK_SHARE_PUBLIC_THEME_HTML_ATTR,
  )};var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:((window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light");document.documentElement.setAttribute(a,t);[${JSON.stringify(
    RISK_SHARE_PUBLIC_SHELL_ROOT_ID,
  )},${JSON.stringify(
    RISK_SHARE_FIELD_ROOT_ID,
  )}].forEach(function(id){var el=document.getElementById(id);if(el)el.setAttribute("data-theme",t);});}catch(e){}})();`;
}

/**
 * Reads the current theme from document.documentElement -- the SSOT toggles
 * should check before flipping, rather than a local shell element's own
 * data-theme. A local element mounted by client-side navigation (e.g. the
 * field page's Link to /risk-share/participation) never had the root
 * layout's beforeInteractive script run against it, so its own data-theme
 * can be stale/unset even though the page is already rendering in the
 * correct theme via html[data-risk-share-public-theme].
 */
export function readRiskSharePublicTheme(): RiskSharePublicTheme {
  return document.documentElement.getAttribute(RISK_SHARE_PUBLIC_THEME_HTML_ATTR) === "dark"
    ? "dark"
    : "light";
}

/**
 * Called by every public risk-share theme toggle right after it flips its
 * own local element's data-theme -- keeps localStorage and the
 * document-level SSOT attribute in sync with that local write.
 */
export function persistRiskSharePublicTheme(next: RiskSharePublicTheme) {
  try {
    document.documentElement.setAttribute(RISK_SHARE_PUBLIC_THEME_HTML_ATTR, next);
    window.localStorage.setItem(RISK_SHARE_PUBLIC_THEME_STORAGE_KEY, next);
  } catch {
    // Theme preference is best-effort only.
  }
}
