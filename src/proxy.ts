import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/constants";

export function employeeReturnTo(url: URL) {
  return `${url.pathname}${url.search}`;
}

export function proxy(request: NextRequest) {
  const returnTo = employeeReturnTo(request.nextUrl);
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(login);
  }
  const headers = new Headers(request.headers);
  headers.set("x-equipqr-return-to", returnTo);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/scan/:path*", "/my-equipment/:path*", "/profile", "/transfer/:path*"] };
