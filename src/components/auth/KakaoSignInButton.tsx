"use client";

import { signIn } from "next-auth/react";

type KakaoSignInButtonProps = {
  callbackUrl: string;
  className?: string;
  children: React.ReactNode;
};

export default function KakaoSignInButton({
  callbackUrl,
  className,
  children,
}: KakaoSignInButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => signIn("kakao", { callbackUrl })}
    >
      {children}
    </button>
  );
}
