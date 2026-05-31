import { NextResponse } from "next/server";

const retiredMessage =
  "몬스 협력사 제출 API는 종료되었습니다. 몬스는 현재 독립 테넌트로 현장참여와 TBM 중심으로 운영합니다.";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "retired_mons_contractor_submit_api",
      message: retiredMessage,
      redirectTo: "/contractor/mons",
    },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "retired_mons_contractor_submit_api",
      message: retiredMessage,
      redirectTo: "/contractor/mons",
    },
    { status: 410 },
  );
}
