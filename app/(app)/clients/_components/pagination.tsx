"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

type PaginationProps = {
  page: number
  totalPages: number
}

export function Pagination({ page, totalPages }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(targetPage))
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" asChild disabled={page <= 1}>
          <Link
            href={buildHref(page - 1)}
            aria-label="Previous page"
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
          >
            <IconChevronLeft className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" size="icon" asChild disabled={page >= totalPages}>
          <Link
            href={buildHref(page + 1)}
            aria-label="Next page"
            aria-disabled={page >= totalPages}
            tabIndex={page >= totalPages ? -1 : undefined}
          >
            <IconChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
