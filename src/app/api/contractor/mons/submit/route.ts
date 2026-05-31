import { NextRequest, NextResponse } from "next/server";

function redirectTo(req: NextRequest) {
  const url = new URL("/field/participation", req.url);
  url.searchParams.set("company", "mons");
  url.searchParams.set("legacy", "contractor_mons_submit_disabled");
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  return redirectTo(req);
}
