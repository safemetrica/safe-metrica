import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const template = read("src/lib/risk-share/riskShareChecklistTemplate.ts");
const page = read("src/app/risk-share/participation/page.tsx");
const route = read("src/app/api/risk-share/participation/submit/route.ts");

const checks = [
  ["stable template identity", /RISK_SHARE_PREWORK_CHECKLIST_TEMPLATE_ID/.test(template) && /RISK_SHARE_PREWORK_CHECKLIST_TEMPLATE_VERSION/.test(template)],
  ["locale-specific labels are copied", /items: \[\.\.\.getRiskShareCopy\(locale\)\.participation\.prework\.checklist\]/.test(template)],
  ["page renders the canonical template", /getRiskSharePreworkChecklistTemplate\(locale\)/.test(page) && /checklistTemplate\?\.items/.test(page)],
  ["page sends template identity", /name="checklistTemplateId"/.test(page) && /name="checklistTemplateVersion"/.test(page)],
  ["server re-derives template", /getRiskSharePreworkChecklistTemplate\(lang\)/.test(route)],
  ["stale form fails closed", /checklistTemplateId/.test(route) && /checklistTemplateVersion/.test(route) && /"form_changed"/.test(route)],
  ["submission snapshots identity and wording", /checklist_template_id/.test(route) && /checklist_template_version/.test(route) && /checklist_locale/.test(route) && /checklist_items_snapshot/.test(route)],
  ["legacy checked_items remains available", /checked_items: checkedItems/.test(route)],
];

for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(`PASS: ${checks.length}/${checks.length} checklist template snapshot contract checks`);
