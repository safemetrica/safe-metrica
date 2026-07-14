"use client";

const FIELD_THEME_STORAGE_KEY = "sm-risk-share-public-theme";

type FieldThemeToggleProps = {
  label: string;
};

/**
 * Keeps the designer Direct Port's exact field__theme/theme-toggle DOM and
 * sun/moon icon markup (previously non-functional decoration) but makes the
 * click actually flip theme. Writes data-theme on the nearest .rsx-shell
 * ancestor and persists to the same localStorage key the #889 shared .rsx-pub
 * shell uses (sm-risk-share-public-theme), so a preference set on one public
 * QR screen carries over to this one. DOM writes only -- no React state, so
 * there is nothing to hydrate and no other screen's theme is affected.
 */
export default function FieldThemeToggle({ label }: FieldThemeToggleProps) {
  return (
    <button
      type="button"
      className="field__theme theme-toggle"
      aria-label={label}
      onClick={(event) => {
        try {
          const shell = event.currentTarget.closest(".rsx-shell");
          if (!shell) return;

          const next = shell.getAttribute("data-theme") === "dark" ? "light" : "dark";
          shell.setAttribute("data-theme", next);
          window.localStorage.setItem(FIELD_THEME_STORAGE_KEY, next);
        } catch {
          // Theme preference is best-effort only.
        }
      }}
    >
      <iconify-icon icon="lucide:sun" className="sun"></iconify-icon>
      <iconify-icon icon="lucide:moon" className="moon"></iconify-icon>
    </button>
  );
}
