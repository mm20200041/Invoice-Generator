"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { IconLoader2 } from "@tabler/icons-react";

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
import { Alert, AlertDescription } from "@/components/ui/alert";

import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { login, resendConfirmation } from "../actions";

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();
  const [serverError, setServerError] = useState<string | null>(
    initialError ?? null,
  );
  const [needsConfirm, setNeedsConfirm] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    setServerError(null);
    setNeedsConfirm(null);
    startTransition(async () => {
      const result = await login(values, next);
      // login() redirects on success, so we only see a result here on failure.
      if (!result) return;
      if (result.status === "needs_confirm") {
        setNeedsConfirm(result.email);
        return;
      }
      if (result.status === "error") {
        setServerError(result.message);
      }
    });
  }

  function onResend() {
    if (!needsConfirm) return;
    startResend(async () => {
      const result = await resendConfirmation({ email: needsConfirm });
      if (result.status === "ok") {
        toast.success(result.message ?? "Confirmation email sent.");
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {needsConfirm && (
          <Alert>
            <AlertDescription className="flex flex-col gap-3">
              <span>
                Please confirm your email before signing in. We sent a link to{" "}
                <span className="font-medium text-foreground">
                  {needsConfirm}
                </span>
                .
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onResend}
                disabled={isResending}
                className="self-start"
              >
                {isResending && (
                  <IconLoader2 className="size-4 animate-spin" />
                )}
                Resend confirmation email
              </Button>
            </AlertDescription>
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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <IconLoader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </Form>
  );
}
