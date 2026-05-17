"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { IconLoader2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { resendConfirmation } from "../actions";

const COOLDOWN_SECONDS = 60;

export function ResendConfirmationButton({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function onClick() {
    startTransition(async () => {
      const result = await resendConfirmation({ email });
      if (result.status === "ok") {
        toast.success(result.message ?? "Confirmation email sent.");
        setCooldown(COOLDOWN_SECONDS);
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  const disabled = isPending || cooldown > 0;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="w-full"
    >
      {isPending && <IconLoader2 className="size-4 animate-spin" />}
      {cooldown > 0
        ? `Resend in ${cooldown}s`
        : isPending
          ? "Sending…"
          : "Resend confirmation email"}
    </Button>
  );
}
