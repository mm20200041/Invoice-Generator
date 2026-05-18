import Link from "next/link"
import { IconUsers } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

export function ClientsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <IconUsers className="size-7 text-muted-foreground" />
      </div>
      <h2 className="mt-5 font-heading text-lg font-medium">No clients yet</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Add your first client and they&apos;ll appear here, ready to be added to
        invoices.
      </p>
      <Button asChild className="mt-6">
        <Link href="/clients/new">Add your first client</Link>
      </Button>
    </div>
  )
}
