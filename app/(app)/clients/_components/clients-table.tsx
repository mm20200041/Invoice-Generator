"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { IconPencil, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

import type { Client } from "@/lib/db/clients"
import { deleteClientAction } from "../actions"

type ClientsTableProps = {
  clients: Client[]
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleDeleteConfirm() {
    if (!pendingDelete) return
    startDeleteTransition(async () => {
      const result = await deleteClientAction(pendingDelete.id)
      setPendingDelete(null)
      if (result.status === "error") {
        toast.error(result.message)
      } else {
        toast.success("Client deleted.")
      }
    })
  }

  return (
    <>
      <div className="rounded-2xl border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  {client.full_name ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {client.company_name ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {client.email ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/clients/${client.id}/edit`} aria-label="Edit client">
                        <IconPencil className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      aria-label="Delete client"
                      onClick={() => setPendingDelete(client)}
                      disabled={isDeleting}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>
                {pendingDelete?.full_name ?? pendingDelete?.company_name ?? "This client"}
              </strong>{" "}
              will be permanently deleted. Existing invoices will keep a snapshot of
              their data and remain unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
