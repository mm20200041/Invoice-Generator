"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { IconUserCircle, IconX, IconArrowRight } from "@tabler/icons-react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

const DISMISS_KEY = "profile-banner-dismissed"
const DISMISS_EVENT = "profile-banner-dismissed-change"

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(DISMISS_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(DISMISS_EVENT, callback)
  }
}

function getDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * Dismissible nudge shown on the dashboard when the user has not filled
 * in either their full name or company name. The dismissal is per-browser
 * (localStorage) so refreshing or navigating does not bring it back, but
 * filling either name field hides it server-side on the next load too.
 */
export function ProfileCompletionBanner() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getDismissed,
    // SSR fallback: render hidden on the server so the banner doesn't
    // flash before hydration reads the real value.
    () => true,
  )

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // ignore — Safari private mode etc.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT))
  }

  if (dismissed) return null

  return (
    <Alert>
      <IconUserCircle />
      <AlertTitle>Finish setting up your profile</AlertTitle>
      <AlertDescription>
        Add your sender details so they appear on every invoice you send.{" "}
        <Link href="/settings/profile" className="inline-flex items-center gap-1 font-medium text-foreground">
          Complete profile
          <IconArrowRight className="size-3.5" />
        </Link>
      </AlertDescription>
      <AlertAction>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <IconX />
        </Button>
      </AlertAction>
    </Alert>
  )
}
