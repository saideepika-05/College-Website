import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/kit/page-header";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import { getStudentAttendanceSummary } from "@/modules/attendance/queries";
import {
  StudentProfile,
  StudentProfileHeaderBadges,
} from "@/modules/people/components/student-profile";
import { listStudents } from "@/modules/people/queries";
import { getEnrollmentHistory } from "@/modules/promotion/service";

export const metadata: Metadata = { title: "Student Profile" };

export default async function HodStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);

  // Scoped listing — a student outside the HOD's departments 404s.
  const students = await listStudents(departmentIds);
  const student = students.find((s) => s.id === id);
  if (!student) notFound();

  const [history, attendance] = await Promise.all([
    getEnrollmentHistory(id),
    getStudentAttendanceSummary(id),
  ]);

  return (
    <>
      <PageHeader
        title={student.name}
        description={`${student.rollNumber} · ${student.departmentName} · ${student.email}`}
        actions={<StudentProfileHeaderBadges isActive={student.isActive} />}
      />
      <StudentProfile
        student={student}
        history={history}
        attendance={attendance}
      />
    </>
  );
}
