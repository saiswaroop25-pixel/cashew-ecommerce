"use client";

import { useRef, useState } from "react";
import { requestUploadAction } from "@/app/actions/admin/media";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { UPLOAD_RULES, validateUploadRequest, type Bucket, type UploadKind } from "@/lib/media/rules";

/**
 * File picker that uploads straight to storage:
 *   1. quick local check (type + size) for instant feedback,
 *   2. ask the server for a one-time ticket (it re-checks everything and picks the file path),
 *   3. send the file to storage with that ticket,
 *   4. hand the stored path to `onUploaded`, whose server action verifies the real file contents.
 * Nothing here is trusted by the server: steps 2 and 4 repeat the checks.
 */
export function Uploader({
  kind,
  label,
  onUploaded,
  disabled,
  buttonLabel = "Choose file…",
}: {
  kind: UploadKind;
  label: string;
  /** receives the stored object path; return an error message to show, or null on success */
  onUploaded: (path: string) => Promise<string | null>;
  disabled?: boolean;
  buttonLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const accept = Object.keys(UPLOAD_RULES[kind].mimes).join(",");

  async function handle(file: File) {
    setError(null);
    setDone(null);
    const local = validateUploadRequest(kind, file.type, file.size);
    if (!local.ok) return setError(local.error);

    setBusy(true);
    try {
      const ticket = await requestUploadAction(kind, file.type, file.size);
      if (!ticket.ok) return setError(ticket.message);

      const { error: uploadError } = await getSupabaseBrowser().storage.from(ticket.bucket as Bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) return setError("The upload failed. Check your connection and try again.");

      const problem = await onUploaded(ticket.path);
      if (problem) return setError(problem);
      setDone(file.name);
    } catch {
      setError("The upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm text-brown">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        id={`up-${kind}-${label}`}
        disabled={busy || disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy || disabled} onClick={() => inputRef.current?.click()}>
        {busy ? "Uploading…" : buttonLabel}
      </Button>
      <p className="mt-1 text-xs text-brown/70">{UPLOAD_RULES[kind].label}</p>
      <p role="status" className="min-h-4 text-xs text-forest">{done ? `Uploaded: ${done}` : ""}</p>
      <p role="alert" className="min-h-4 text-xs text-red-700">{error}</p>
    </div>
  );
}
