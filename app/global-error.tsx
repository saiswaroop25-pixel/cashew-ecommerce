"use client";

/**
 * Last-resort page used when the root layout itself fails. It replaces the whole document, so it carries
 * its own minimal inline styling (the site stylesheet is not available here).
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F8F3E9", color: "#38271F", fontFamily: "Georgia, serif" }}>
        <main style={{ maxWidth: 520, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <h1 style={{ color: "#344B35", fontSize: 32 }}>Something went wrong</h1>
          <p style={{ fontFamily: "Arial, sans-serif", color: "#795438" }}>Sorry about that. Please try again in a moment.</p>
          {digest && <p style={{ fontFamily: "monospace", fontSize: 12 }}>Reference: {digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#344B35", color: "#F8F3E9", fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
