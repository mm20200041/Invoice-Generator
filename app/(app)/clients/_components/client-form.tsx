"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { IconLoader2, IconUser } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

import {
  clientFormSchema,
  clientFormDefaults,
  type ClientFormInput,
} from "@/lib/validators/clients"
import { createClientAction, updateClientAction } from "../actions"

type ClientFormProps = {
  mode: "create" | "edit"
  clientId?: string
  initialValues?: ClientFormInput
}

export function ClientForm({ mode, clientId, initialValues }: ClientFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ClientFormInput>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: initialValues ?? clientFormDefaults,
  })

  function onSubmit(values: ClientFormInput) {
    setServerError(null)
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createClientAction(values)
          : await updateClientAction(clientId!, values)

      if (result.status === "error") {
        setServerError(result.message)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <IconUser className="size-5 text-primary" />
            <CardTitle>Client details</CardTitle>
            <CardDescription>
              At least a full name or company name is required. All other fields
              are optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="name"
                        placeholder="Jane Doe"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="organization"
                        placeholder="Acme Inc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="client@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="street-address"
                        placeholder="123 Main St"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City / Country</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="address-level2"
                        placeholder="Berlin, Germany"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vat_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VAT ID</FormLabel>
                  <FormControl>
                    <Input placeholder="EU123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/clients")}
            disabled={isPending}
          >
            Discard
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <IconLoader2 className="size-4 animate-spin" />}
            {mode === "create" ? "Add client" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
