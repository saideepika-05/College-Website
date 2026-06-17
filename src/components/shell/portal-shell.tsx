"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavIcon } from "@/components/shell/icon";
import type { NavGroup } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/**
 * Desktop-first portal shell (Admin / HOD / Teacher): collapsible sidebar,
 * sticky header with the user menu. Student portal uses StudentShell.
 */
export function PortalShell({
  portalLabel,
  accentClass,
  nav,
  user,
  search,
  children,
}: {
  portalLabel: string;
  /** Tailwind text-* class tinting the brand mark per role. */
  accentClass: string;
  nav: NavGroup[];
  user: { name: string; email: string; roleLabel: string };
  /** Optional search affordance rendered in the header (e.g. ⌘K palette). */
  search?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent ${accentClass}`}
            >
              <GraduationCap className="size-4" />
            </div>
            <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">College ERP</span>
              <span className="text-xs text-muted-foreground">
                {portalLabel}
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {nav.map((group, gi) => (
            <SidebarGroup key={gi}>
              {group.label ? (
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href.split("/").length > 2 &&
                        pathname.startsWith(`${item.href}/`));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                        >
                          <Link href={item.href}>
                            <NavIcon name={item.icon} className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="ml-auto flex items-center gap-2">
            {search}
            <UserMenu {...user} />
          </div>
        </header>
        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
