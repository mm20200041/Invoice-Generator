import { UserMenu } from "./user-menu";

export function Header({ email }: { email: string }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur sm:px-6">
      <div className="text-sm text-muted-foreground">
        {/* Page title slot — pages can render their own h1 in the main area */}
      </div>
      <UserMenu email={email} />
    </header>
  );
}
