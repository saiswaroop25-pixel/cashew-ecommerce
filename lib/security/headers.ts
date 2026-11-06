/**
 * HTTP security headers and Content-Security-Policy, as pure functions (unit tested, imported by next.config.ts).
 *
 * CSP note: Next.js offers nonce-based CSP, but that forces every page to render dynamically and gives up
 * the fast static/partially-prerendered pages. We use the documented non-nonce policy instead: scripts may
 * run inline, but ONLY from our own origin plus Razorpay; everything else (images, API calls, frames, forms,
 * plugins, <base>) is locked to an explicit allow-list. React escapes all user-supplied text, and the site
 * never injects raw HTML from users, so the inline allowance is not an XSS door in practice.
 */
export type HeaderOptions = {
  isDev: boolean;
  /** hostname of the Supabase project (e.g. abcd.supabase.co), or null if not configured */
  supabaseHost: string | null;
};

const RAZORPAY = {
  script: "https://checkout.razorpay.com",
  frame: ["https://api.razorpay.com", "https://checkout.razorpay.com"],
  connect: ["https://api.razorpay.com", "https://lumberjack.razorpay.com", "https://checkout.razorpay.com"],
  img: "https://*.razorpay.com",
};

export function buildCsp({ isDev, supabaseHost }: HeaderOptions): string {
  const supabase = supabaseHost ? [`https://${supabaseHost}`] : [];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", RAZORPAY.script, ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...supabase, RAZORPAY.img],
    "font-src": ["'self'", "data:"],
    // Supabase: browser uploads to storage with one-time signed tokens
    "connect-src": ["'self'", ...supabase, ...RAZORPAY.connect, ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : [])],
    "frame-src": RAZORPAY.frame,
    "media-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!isDev) parts.push("upgrade-insecure-requests"); // would break plain-http localhost in dev
  return parts.join("; ");
}

export type Header = { key: string; value: string };

/** Headers for every response. */
export function securityHeaders(opts: HeaderOptions): Header[] {
  return [
    { key: "Content-Security-Policy", value: buildCsp(opts) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Razorpay's iframe needs the Payment Request API; everything else is switched off.
    { key: "Permissions-Policy", value: 'camera=(), microphone=(), geolocation=(), usb=(), payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com")' },
    // Payment/bank pop-ups need window.opener, so allow popups while still isolating the page.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    ...(opts.isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
  ];
}

/** Pages that show personal or admin data must never be stored by shared caches or the back button. */
export const PRIVATE_PATHS = ["/admin/:path*", "/account/:path*", "/cart", "/checkout/:path*", "/login", "/register", "/reset-password", "/forgot-password"];

export const privateCacheHeaders: Header[] = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];
