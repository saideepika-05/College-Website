import type { ReactNode } from "react";
import { StudentShell } from "@/components/shell/student-shell";
import type { NavItem } from "@/components/shell/nav";
import { requireRole } from "@/lib/session";

const TABS: NavItem[] = [
  { title: "Home", href: "/student", icon: "home" },
  { title: "Scan", href: "/student/scan", icon: "qr-code" },
  { title: "Attendance", href: "/student/attendance", icon: "clipboard-check" },
  { title: "Timetable", href: "/student/timetable", icon: "calendar" },
  { title: "Assignments", href: "/student/assignments", icon: "clipboard-list" },
];

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("STUDENT");
  return (
    <StudentShell
      tabs={TABS}
      user={{ name: user.name, email: user.email, roleLabel: "Student" }}
    >
      {children}
    </StudentShell>
  );
}
