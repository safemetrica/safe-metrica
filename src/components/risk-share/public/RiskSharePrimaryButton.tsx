"use client";

import { useEffect, useRef, useState } from "react";

type RiskSharePrimaryButtonProps = {
  label: string;
  submittingLabel: string;
  className?: string;
};

/**
 * Shared submit CTA for the five public risk-share QR screens. These forms
 * post to plain server routes (not React server actions), so double-submit
 * protection is done with local state rather than useFormStatus. The guard
 * listens for the form's native "submit" event (fired only after HTML5
 * required-field validation passes) rather than the button's click, so a
 * blocked native validation leaves the button enabled and a second submit
 * attempt is ignored. The 303 redirect response that follows a successful
 * submit unmounts this component, so there is nothing to reset on success.
 */
export default function RiskSharePrimaryButton({ label, submittingLabel, className }: RiskSharePrimaryButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) return;

    const handleSubmit = (event: SubmitEvent) => {
      if (hasSubmittedRef.current) {
        event.preventDefault();
        return;
      }
      hasSubmittedRef.current = true;
      setIsSubmitting(true);
    };

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  return (
    <button
      ref={buttonRef}
      type="submit"
      disabled={isSubmitting}
      aria-busy={isSubmitting}
      className={`rsx-pub-cta flex w-full items-center justify-center rounded-2xl px-5 text-base font-black ${className ?? ""}`}
    >
      {isSubmitting ? submittingLabel : label}
    </button>
  );
}
