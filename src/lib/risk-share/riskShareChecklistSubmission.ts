export type ChecklistSubmissionTemplate = {
  templateId: string;
  templateVersion: string;
  items: readonly string[];
};

export type ChecklistSubmissionResolution =
  | { ok: false; reason: "form_changed" }
  | {
      ok: true;
      checkedItems: Array<{ label: string; checked: boolean }>;
      checkedCount: number;
      allChecked: boolean;
    };

/**
 * Validates the browser's template identity against the server-owned
 * template, then builds the immutable wording/answer snapshot. Browser
 * labels and counts are never trusted.
 */
export function resolveChecklistSubmission(input: {
  template: ChecklistSubmissionTemplate;
  submittedTemplateId: string;
  submittedTemplateVersion: string;
  isChecked: (index: number) => boolean;
}): ChecklistSubmissionResolution {
  const {
    template,
    submittedTemplateId,
    submittedTemplateVersion,
    isChecked,
  } = input;

  if (
    submittedTemplateId !== template.templateId ||
    submittedTemplateVersion !== template.templateVersion
  ) {
    return { ok: false, reason: "form_changed" };
  }

  const checkedItems = template.items.map((label, index) => ({
    label,
    checked: isChecked(index),
  }));
  const checkedCount = checkedItems.filter((item) => item.checked).length;

  return {
    ok: true,
    checkedItems,
    checkedCount,
    allChecked:
      checkedItems.length > 0 && checkedCount === checkedItems.length,
  };
}
