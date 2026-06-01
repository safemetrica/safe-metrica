export const TBM_VOICE_UPLOAD_FIELD_KEYS = {
  signature: "signatureFiles",
  site: "siteFiles",
  work: "workFiles",
  action: "actionFiles",
} as const;

export type TbmVoiceUploadFieldKey =
  (typeof TBM_VOICE_UPLOAD_FIELD_KEYS)[keyof typeof TBM_VOICE_UPLOAD_FIELD_KEYS];
