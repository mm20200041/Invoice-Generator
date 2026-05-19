"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconTrash,
  IconSend,
  IconCheck,
  IconDownload,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { deleteInvoiceAction, markInvoicePaidAction } from "@/lib/actions/invoices"

export type InvoiceActionInvoice = {
  id: string
  number: string
  status: "not_paid" | "paid"
}

interface InvoiceActionsProps {
  invoice: InvoiceActionInvoice
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    const result = await deleteInvoiceAction(invoice.id)
    setIsLoading(false)
    setShowDelete(false)

    if (result.ok) {
      toast.success("Invoice deleted")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const handleSend = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" })
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
    const result = await markInvoicePaidAction(invoice.id)
    setIsLoading(false)
    setShowMarkPaid(false)

    if (result.ok) {
      toast.success("Invoice marked as paid")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const isPaid = invoice.status === "paid"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <IconDotsVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}`)}>
            <IconEye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>

          {!isPaid && (
            <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}/edit`)}>
              <IconPencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")}>
            <IconDownload className="mr-2 h-4 w-4" />
            Download PDF
          </DropdownMenuItem>

          {!isPaid && (
            <DropdownMenuItem onClick={() => setShowSend(true)}>
              <IconSend className="mr-2 h-4 w-4" />
              Send
            </DropdownMenuItem>
          )}

          {!isPaid && (
            <DropdownMenuItem onClick={() => setShowMarkPaid(true)}>
              <IconCheck className="mr-2 h-4 w-4" />
              Mark Paid
            </DropdownMenuItem>
          )}

          {!isPaid && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive">
                <IconTrash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete invoice {invoice.number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Confirmation */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Send invoice {invoice.number}{" "} to the client? A copy will be BCC&apos;d to you if
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

      {/* Mark Paid Confirmation */}
      <AlertDialog open={showMarkPaid} onOpenChange={setShowMarkPaid}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark invoice {invoice.number} as paid? This will close any open payment links.
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
