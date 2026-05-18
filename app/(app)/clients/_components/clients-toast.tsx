"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

export function ClientsToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const created = searchParams.get("created")
    const updated = searchParams.get("updated")

    if (created === "1") {
      toast.success("Client added.")
    } else if (updated === "1") {
      toast.success("Client updated.")
    }

    if (created || updated) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("created")
      params.delete("updated")
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }
  }, [searchParams, router, pathname])

  return null
}
