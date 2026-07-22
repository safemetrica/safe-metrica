import assert from "node:assert/strict";
import { resolveChecklistSubmission } from "../src/lib/risk-share/riskShareChecklistSubmission.ts";

const template = {
  templateId: "risk-share-prework-core",
  templateVersion: "1",
  items: ["첫 번째 서버 문구", "두 번째 서버 문구"],
};

const accepted = resolveChecklistSubmission({
  template,
  submittedTemplateId: template.templateId,
  submittedTemplateVersion: template.templateVersion,
  isChecked: (index) => index === 0,
});
assert.deepEqual(accepted, {
  ok: true,
  checkedItems: [
    { label: "첫 번째 서버 문구", checked: true },
    { label: "두 번째 서버 문구", checked: false },
  ],
  checkedCount: 1,
  allChecked: false,
});

const allChecked = resolveChecklistSubmission({
  template,
  submittedTemplateId: template.templateId,
  submittedTemplateVersion: template.templateVersion,
  isChecked: () => true,
});
assert.equal(allChecked.ok && allChecked.allChecked, true);

for (const [submittedTemplateId, submittedTemplateVersion] of [
  ["tampered-template", template.templateVersion],
  [template.templateId, "stale-version"],
]) {
  assert.deepEqual(
    resolveChecklistSubmission({
      template,
      submittedTemplateId,
      submittedTemplateVersion,
      isChecked: () => true,
    }),
    { ok: false, reason: "form_changed" },
  );
}

const empty = resolveChecklistSubmission({
  template: { ...template, items: [] },
  submittedTemplateId: template.templateId,
  submittedTemplateVersion: template.templateVersion,
  isChecked: () => true,
});
assert.equal(empty.ok && empty.allChecked, false);

console.log("PASS checklist submission behavioral contract");
