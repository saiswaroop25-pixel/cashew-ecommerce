import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before matched requests to (1) refresh the Supabase session cookie and
 * (2) do an *optimistic* sign-in redirect for private areas. This is not the
 * security boundary: every page/action re-checks via lib/auth/dal.ts.
 */
const PRIVATE_PREFIXES = ["/account", "/admin"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list, headers) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // No-store headers stop a CDN caching one user's session cookie for another.
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // getClaims validates the JWT signature (JWKS) and refreshes the token if needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;

  const { pathname, search } = request.nextUrl;
  if (!signedIn && PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    // Skip static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm|glb|gltf|vtt)$).*)",
  ],
};
