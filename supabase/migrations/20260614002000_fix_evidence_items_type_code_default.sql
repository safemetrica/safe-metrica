alter table public.evidence_items
  alter column evidence_type_code set default 'photo';

comment on column public.evidence_items.evidence_type_code is
  'Broad evidence type constrained to photo, checklist, edu, sign, or report. Specific purpose is stored in evidence_role.';
