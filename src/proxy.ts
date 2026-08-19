import { NextResponse } from "next/server";
import { auth } from "@/auth";

// AUTH_DISABLED=true bypasses the sign-in gate (dev/demo only).
export const proxy =
  process.env.AUTH_DISABLED === "true" ? () => NextResponse.next() : auth;

export const config = {
  matcher: ["/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)"],
};
