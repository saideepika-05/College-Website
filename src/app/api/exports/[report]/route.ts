import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sections } from "@/db/schema";
import { getHodDepartmentIds } from "@/lib/authz";
import { getSession } from "@/lib/session";
import {
  assignmentReport,
  sectionAttendanceReport,
  studentRosterReport,
  teacherRosterReport,
  type ReportData,
} from "@/modules/reports/data";
import { toCsv, toPdf, toXlsx } from "@/modules/reports/exporters";

/**
 * GET /api/exports/[report]?format=csv|xlsx|pdf&sectionId=&departmentId=
 *
 * Reports: section-attendance (requires sectionId), student-roster,
 * teacher-roster, assignments. Admin sees everything; HOD only their
 * departments; everyone else is rejected.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  try {
    const { report } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "csv";
    const sectionId = url.searchParams.get("sectionId");
    const departmentId = url.searchParams.get("departmentId");

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    let departmentIds: string[] | undefined;

    if (role === "ADMIN") {
      departmentIds = departmentId ? [departmentId] : undefined;
    } else if (role === "HOD") {
      const scoped = await getHodDepartmentIds(session.user.id);
      if (scoped.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (departmentId && !scoped.includes(departmentId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      departmentIds = departmentId ? [departmentId] : scoped;

      if (report === "section-attendance" && sectionId) {
        const [section] = await db
          .select({ departmentId: sections.departmentId })
          .from(sections)
          .where(eq(sections.id, sectionId))
          .limit(1);
        if (!section || !scoped.includes(section.departmentId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let data: ReportData;
    switch (report) {
      case "section-attendance":
        if (!sectionId) {
          return NextResponse.json(
            { error: "sectionId is required" },
            { status: 400 },
          );
        }
        data = await sectionAttendanceReport(sectionId);
        break;
      case "student-roster":
        data = await studentRosterReport(departmentIds);
        break;
      case "teacher-roster":
        data = await teacherRosterReport(departmentIds);
        break;
      case "assignments":
        data = await assignmentReport(departmentIds);
        break;
      default:
        return NextResponse.json(
          { error: "Unknown report" },
          { status: 404 },
        );
    }

    switch (format) {
      case "xlsx":
        return await toXlsx(data);
      case "pdf":
        return await toPdf(data);
      default:
        return toCsv(data);
    }
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 },
    );
  }
}
