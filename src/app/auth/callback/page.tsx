import type { Metadata } from "next";

import InvitePasswordForm from "./InvitePasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "비밀번호 설정 | SafeMetrica",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
  referrer: "no-referrer",
};

export default function AuthInviteCallbackPage() {
  return <InvitePasswordForm />;
}
