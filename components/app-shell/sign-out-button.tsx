"use client";

import { useTransition } from "react";
import { IconLoader2, IconLogout } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";

/**
 * Standalone full-width sign-out button (used in the sidebar footer).
 * Shares the same `signOut` server action as the header dropdown.
 */
export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
    >
      {isPending ? (
        <IconLoader2 className="size-4 animate-spin" />
      ) : (
        <IconLogout className="size-4" />
      )}
      Log out
    </Button>
  );
}
