"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Two-step button for risky actions: the first click arms it ("Are you sure?"), the second submits
 * the surrounding form. Disarms itself when focus leaves, so it can't stay armed by accident.
 */
export function ConfirmButton({
  children,
  confirmLabel = "Yes, do it",
  variant = "outline",
  disabled,
}: {
  children: React.ReactNode;
  confirmLabel?: string;
  variant?: "outline" | "primary" | "ghost";
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      type="submit"
      size="sm"
      variant={armed ? "primary" : variant}
      disabled={disabled}
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      className={armed ? "bg-red-800 hover:bg-red-900" : undefined}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
