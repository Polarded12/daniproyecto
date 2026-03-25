import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Refresh Supabase session if configured
  const response = await updateSession(request);
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
