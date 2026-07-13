"use client";

import { useState } from "react";

type RiskSharePrimaryButtonProps = {
  label: string;
  submittingLabel: string;
  className?: string;
};

/**
 * Shared submit CTA for the five public risk-share QR screens. These forms
 * post to plain server routes (not React server actions), so double-submit
 * protection is done with local state rather than useFormStatus: on click we
 * disable the button and swap to the submitting label, then let the native
 * form submission proceed. The 303 redirect response that follows unmounts
 * this component, so there is nothing to reset on success.
 */
export default function RiskSharePrimaryButton({ label, submittingLabel, className }: RiskSharePrimaryButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <button
      type="submit"
      disabled={isSubmitting}
      onClick={() => setIsSubmitting(true)}
      className={`rsx-pub-cta flex w-full items-center justify-center rounded-2xl px-5 text-base font-black ${className ?? ""}`}
    >
      {isSubmitting ? submittingLabel : label}
    </button>
  );
}
