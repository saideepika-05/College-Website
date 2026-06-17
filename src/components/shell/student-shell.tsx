"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavIcon } from "@/components/shell/icon";
import type { NavItem } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { cn } from "@/lib/utils";

/**
 * Mobile-first student shell: sticky header + thumb-reach bottom tab bar.
 * On ≥md screens the tab bar becomes a top nav row.
 */
export function StudentShell({
  tabs,
  user,
  children,
}: {
  tabs: NavItem[];
  user: { name: string; email: string; roleLabel: string };
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 px-4">
          <Link href="/student" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </div>
            <span className="text-sm font-semibold">College ERP</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {tabs.map((tab) => {
              const active =
                pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.title}
                </Link>
              );
            })}
          </nav>
          <UserMenu {...user} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 pb-24 md:pb-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div
          className="mx-auto grid max-w-3xl"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
        >
          {tabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <NavIcon name={tab.icon} className="size-5" />
                {tab.title}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
