"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import {
  IconLoader2,
  IconUser,
  IconAdjustmentsHorizontal,
  IconMail,
} from "@tabler/icons-react"

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"

import {
  profileFormSchema,
  CURRENCY_CODES,
  type ProfileFormInput,
} from "@/lib/validators/profile"
import { updateProfile } from "./actions"

type ProfileFormProps = {
  initialValues: ProfileFormInput
  authEmail: string
}

export function ProfileForm({ initialValues, authEmail }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialValues,
  })

  function onSubmit(values: ProfileFormInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await updateProfile(values)
      if (result.status === "error") {
        setServerError(result.message)
        return
      }
      form.reset(values)
      toast.success(result.message ?? "Profile saved.")
    })
  }

  function onDiscard() {
    setServerError(null)
    form.reset(initialValues)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {/* Account email (read-only) */}
        <Card>
          <CardHeader>
            <IconMail className="size-5 text-primary" />
            <CardTitle>Account email</CardTitle>
            <CardDescription>
              Used for sign-in. Contact support to change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input value={authEmail} readOnly disabled aria-label="Account email" />
          </CardContent>
        </Card>

        {/* Sender details */}
        <Card>
          <CardHeader>
            <IconUser className="size-5 text-primary" />
            <CardTitle>Sender details</CardTitle>
            <CardDescription>
              Shown as the &ldquo;From&rdquo; block on every invoice. All fields
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
                  <FormLabel>Sender email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Clients receive replies at this address. Defaults to your
                    account email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="street-address"
                      placeholder="Street, City, Country"
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

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        inputMode="url"
                        placeholder="https://example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <IconAdjustmentsHorizontal className="size-5 text-primary" />
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Defaults used when creating new invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="default_vat_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default VAT rate</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min={0}
                          max={100}
                          placeholder="20"
                          className="pr-8"
                          {...field}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Pre-fills new line items. Leave empty to default to 0.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default currency</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCY_CODES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Pre-fills the currency when creating a new invoice.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bcc_on_send"
              render={({ field }) => (
                <FormItem className="flex items-start justify-between gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="grid gap-1">
                    <FormLabel>BCC me on every sent invoice</FormLabel>
                    <FormDescription>
                      You will receive a blind copy of each invoice email at
                      your account address.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onDiscard}
            disabled={isPending || !form.formState.isDirty}
          >
            Discard changes
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <IconLoader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
