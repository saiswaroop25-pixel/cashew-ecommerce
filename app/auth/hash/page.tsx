"use client";

import { useEffect, useState } from "react";
import { safeNext } from "@/lib/auth/safe-next";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Landing page for password-reset emails. The link carries a one-time session in the part of the address after "#",
 * which only the browser can read, so this page reads it, starts the session, and moves on. It does not depend on
 * anything saved when the email was requested, so the link works in any browser or device.
 */
export default function AuthHash() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const next = safeNext(new URLSearchParams(window.location.search).get("next"), "/account");
    if (!access_token || !refresh_token) {
      window.location.replace("/login?error=link");
      return;
    }
    (async () => {
      try {
        const { error } = await getSupabaseBrowser().auth.setSession({ access_token, refresh_token });
        if (error) setFailed(true);
        else window.location.replace(next);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-24 text-center">
      {failed ? (
        <p role="alert" className="text-brown">
          That link is invalid or has expired. <a className="underline" href="/forgot-password">Request a new one</a>.
        </p>
      ) : (
        <p className="text-brown" role="status">Checking your link…</p>
      )}
    </main>
  );
}
