import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Labelled input with accessible error wiring. */
export function Field({ label, error, hint, id, name, className, ...props }: FieldProps) {
  const inputId = id ?? `f-${name}`;
  const errId = `${inputId}-err`;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm text-brown">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-chocolate",
          error ? "border-red-700" : "border-cashew",
          className,
        )}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-brown">{hint}</p>}
      {error && (
        <p id={errId} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ ok, message }: { ok?: boolean; message?: string }) {
  if (!message) return null;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={cn(
        "rounded-lg px-4 py-3 text-sm",
        ok ? "bg-forest/10 text-forest" : "bg-red-50 text-red-800",
      )}
    >
      {message}
    </p>
  );
}
