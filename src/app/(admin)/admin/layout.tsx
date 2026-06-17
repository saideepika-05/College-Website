import type { ReactNode } from "react";
import { PortalShell } from "@/components/shell/portal-shell";
import type { NavGroup } from "@/components/shell/nav";
import { requireRole } from "@/lib/session";
import { adminGlobalSearch } from "@/modules/search/actions";
import { SearchCommand } from "@/modules/search/components/search-command";

const NAV: NavGroup[] = [
  {
    items: [{ title: "Dashboard", href: "/admin", icon: "dashboard" }],
  },
  {
    label: "Academic Structure",
    items: [
      { title: "Branches", href: "/admin/branches", icon: "building" },
      { title: "Departments", href: "/admin/departments", icon: "school" },
      {
        title: "Academic Sessions",
        href: "/admin/academic-sessions",
        icon: "calendar-range",
      },
      { title: "Sections", href: "/admin/sections", icon: "layers" },
      { title: "Subjects", href: "/admin/subjects", icon: "book-open" },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Students", href: "/admin/students", icon: "graduation-cap" },
      { title: "Teachers", href: "/admin/teachers", icon: "users" },
      {
        title: "Subject Assignments",
        href: "/admin/teacher-assignments",
        icon: "user-cog",
      },
      { title: "HODs", href: "/admin/hods", icon: "user-cog" },
      { title: "Promotion", href: "/admin/promotion", icon: "trending-up" },
    ],
  },
  {
    label: "Academics",
    items: [
      { title: "Timetables", href: "/admin/timetables", icon: "calendar" },
      {
        title: "Attendance",
        href: "/admin/attendance",
        icon: "clipboard-check",
      },
      {
        title: "Assignments",
        href: "/admin/assignments",
        icon: "clipboard-list",
      },
      { title: "Notices", href: "/admin/notices", icon: "megaphone" },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Reports", href: "/admin/reports", icon: "file-text" },
      { title: "Audit Logs", href: "/admin/audit-logs", icon: "scroll" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("ADMIN");
  return (
    <PortalShell
      portalLabel="Admin Portal"
      accentClass="text-blue-600 dark:text-blue-400"
      nav={NAV}
      user={{ name: user.name, email: user.email, roleLabel: "Administrator" }}
      search={
        <SearchCommand
          action={adminGlobalSearch}
          placeholder="Search students, teachers, sections…"
        />
      }
    >
      {children}
    </PortalShell>
  );
}
