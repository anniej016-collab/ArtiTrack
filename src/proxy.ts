import { NextResponse, type NextRequest } from "next/server";
import {
  LOGIN_PATH,
  SESSION_COOKIE,
  isPasswordSet,
  isRequestAllowed,
  sessionTokenFor,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const password = process.env.ARTITRACK_PASSWORD;
  const passwordSet = isPasswordSet(password);

  const allowed = isRequestAllowed({
    pathname: request.nextUrl.pathname,
    cookieValue: request.cookies.get(SESSION_COOKIE)?.value,
    expectedToken: passwordSet ? await sessionTokenFor(password!) : undefined,
    passwordSet,
  });

  if (allowed) return NextResponse.next();

  const login = new URL(LOGIN_PATH, request.url);
  // Come back to whatever was being opened once signed in.
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own static output, which the gate would only slow down.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
