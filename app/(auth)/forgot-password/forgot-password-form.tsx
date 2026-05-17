"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { IconLoader2, IconMailCheck } from "@tabler/icons-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validators/auth";
import { forgotPassword } from "../actions";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await forgotPassword(values);
      if (result.status === "ok") {
        setDone(true);
      } else if (result.status === "error") {
        setServerError(result.message);
      }
    });
  }

  if (done) {
    return (
      <Alert>
        <IconMailCheck />
        <AlertTitle>Check your inbox</AlertTitle>
        <AlertDescription>
          If an account exists for that email, we just sent a password reset
          link. The link is valid for one hour.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

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
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <IconLoader2 className="size-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </Form>
  );
}
