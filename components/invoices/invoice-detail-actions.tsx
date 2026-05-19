"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconSend, IconCheck } from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { markInvoicePaidAction } from "@/lib/actions/invoices"

interface InvoiceDetailActionsProps {
  invoiceId: string
  invoiceNumber: string
}

export function InvoiceDetailActions({ invoiceId, invoiceNumber }: InvoiceDetailActionsProps) {
  const router = useRouter()
  const [showSend, setShowSend] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: "POST" })
      const data = await res.json()
      setIsLoading(false)
      setShowSend(false)
      if (data.ok) {
        toast.success("Invoice sent")
        router.refresh()
      } else {
        toast.error(data.error || "Failed to send invoice")
      }
    } catch {
      setIsLoading(false)
      toast.error("Failed to send invoice")
    }
  }

  const handleMarkPaid = async () => {
    setIsLoading(true)
    const result = await markInvoicePaidAction(invoiceId)
    setIsLoading(false)
    setShowMarkPaid(false)
    if (result.ok) {
      toast.success("Invoice marked as paid")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setShowSend(true)}>
        <IconSend className="mr-2 h-4 w-4" />
        Send to Client
      </Button>

      <Button onClick={() => setShowMarkPaid(true)}>
        <IconCheck className="mr-2 h-4 w-4" />
        Mark as Paid
      </Button>

      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Send invoice {invoiceNumber} to the client? A copy will be BCC&apos;d to you if
              enabled in settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSend(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isLoading}>
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showMarkPaid} onOpenChange={setShowMarkPaid}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark invoice {invoiceNumber} as paid? This will close any open payment links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPaid} disabled={isLoading}>
              Mark Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
