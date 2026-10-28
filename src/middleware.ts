import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "gmao_session";
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

const PUBLIC_PATHS = ["/login"];

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Buffer.from(sig).toString("base64url");
}

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  const expected = await sign(body);
  if (expected !== signature) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = await isValidSession(token);

  if (!valid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes handled separately if any
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico and other static assets
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
