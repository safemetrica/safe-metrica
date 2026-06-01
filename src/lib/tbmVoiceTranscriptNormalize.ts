const TBM_TRANSCRIPT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/엔\s*고\s*소\s*대/g, "고소대"],
  [/온\s*혈\s*질\s*환/g, "온열질환"],
  [/온혈질환/g, "온열질환"],
  [/만전을\s*기\s*해야/g, "만전을 기해야"],
  [/게임/g, "끼임"],
  [/위염/g, "위험"],
  [/렉/g, "랙"],
];

export function normalizeTbmVoiceTranscript(text: string): string {
  return TBM_TRANSCRIPT_REPLACEMENTS.reduce(
    (normalizedText, [pattern, replacement]) => normalizedText.replace(pattern, replacement),
    text
  )
    .replace(/\s+/g, " ")
    .trim();
}
