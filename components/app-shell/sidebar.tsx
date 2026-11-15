import Link from "next/link";
import {
  IconDashboard,
  IconFileInvoice,
  IconUsers,
  IconSettings,
  IconFileInvoice as IconBrand,
} from "@tabler/icons-react";

import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "./sign-out-button";

const NAV: { href: string; label: string; Icon: typeof IconDashboard }[] = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/invoices", label: "Invoices", Icon: IconFileInvoice },
  { href: "/clients", label: "Clients", Icon: IconUsers },
];

const SETTINGS: { href: string; label: string; Icon: typeof IconDashboard }[] = [
  { href: "/settings/profile", label: "Profile", Icon: IconSettings },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar/40 md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-5">
        <IconBrand className="size-5 text-primary" />
        <span className="font-heading text-sm font-semibold">Invoice Gen</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <ul className="grid gap-1">
          {NAV.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group/sidebar-item flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <Separator className="my-3" />

        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
          Settings
        </p>
        <ul className="grid gap-1">
          {SETTINGS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group/sidebar-item flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border/60 p-3">
        <SignOutButton />
      </div>
    </aside>
  );
}
