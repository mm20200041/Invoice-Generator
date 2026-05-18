import { ClientForm } from "../_components/client-form"

export const metadata = {
  title: "Add Client — Invoice Generator",
}

export default function NewClientPage() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Add client
        </h1>
        <p className="text-sm text-muted-foreground">
          Client details will be available to select when creating invoices.
        </p>
      </div>

      <ClientForm mode="create" />
    </div>
  )
}
