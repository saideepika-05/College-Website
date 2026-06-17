import type { ReactNode } from "react";
import { PortalShell } from "@/components/shell/portal-shell";
import type { NavGroup } from "@/components/shell/nav";
import { requireRole } from "@/lib/session";

const NAV: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", href: "/teacher", icon: "dashboard" },
      { title: "My Classes", href: "/teacher/classes", icon: "users" },
      { title: "Timetable", href: "/teacher/timetable", icon: "calendar" },
    ],
  },
  {
    label: "Teaching",
    items: [
      {
        title: "Attendance",
        href: "/teacher/attendance",
        icon: "qr-code",
      },
      {
        title: "Assignments",
        href: "/teacher/assignments",
        icon: "clipboard-list",
      },
      { title: "Notices", href: "/teacher/notices", icon: "megaphone" },
    ],
  },
];

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("TEACHER");
  return (
    <PortalShell
      portalLabel="Teacher Portal"
      accentClass="text-emerald-600 dark:text-emerald-400"
      nav={NAV}
      user={{ name: user.name, email: user.email, roleLabel: "Teacher" }}
    >
      {children}
    </PortalShell>
  );
}
