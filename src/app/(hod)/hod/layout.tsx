import type { ReactNode } from "react";
import { PortalShell } from "@/components/shell/portal-shell";
import type { NavGroup } from "@/components/shell/nav";
import { requireRole } from "@/lib/session";
import { hodScopedSearch } from "@/modules/search/actions";
import { SearchCommand } from "@/modules/search/components/search-command";

const NAV: NavGroup[] = [
  {
    items: [{ title: "Dashboard", href: "/hod", icon: "dashboard" }],
  },
  {
    label: "Department",
    items: [
      { title: "Students", href: "/hod/students", icon: "graduation-cap" },
      { title: "Teachers", href: "/hod/teachers", icon: "users" },
      {
        title: "Subject Assignments",
        href: "/hod/teacher-assignments",
        icon: "user-cog",
      },
      { title: "Promotion", href: "/hod/promotion", icon: "trending-up" },
    ],
  },
  {
    label: "Academics",
    items: [
      { title: "Timetables", href: "/hod/timetables", icon: "calendar" },
      {
        title: "Attendance",
        href: "/hod/attendance",
        icon: "clipboard-check",
      },
      {
        title: "Assignments",
        href: "/hod/assignments",
        icon: "clipboard-list",
      },
      { title: "Notices", href: "/hod/notices", icon: "megaphone" },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Reports", href: "/hod/reports", icon: "file-text" },
      { title: "Audit Logs", href: "/hod/audit-logs", icon: "scroll" },
    ],
  },
];

export default async function HodLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("HOD");
  return (
    <PortalShell
      portalLabel="HOD Portal"
      accentClass="text-violet-600 dark:text-violet-400"
      nav={NAV}
      user={{
        name: user.name,
        email: user.email,
        roleLabel: "Head of Department",
      }}
      search={
        <SearchCommand
          action={hodScopedSearch}
          placeholder="Search within your department…"
        />
      }
    >
      {children}
    </PortalShell>
  );
}
