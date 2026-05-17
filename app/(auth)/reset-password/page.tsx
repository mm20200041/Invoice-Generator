import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Set a new password — Invoice Generator",
};

export default function ResetPasswordPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Set a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
