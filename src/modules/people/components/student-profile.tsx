import {
  ArrowRight,
  CalendarCheck,
  GraduationCap,
  Percent,
} from "lucide-react";
import { StatCard } from "@/components/kit/stat-card";
import { StatusBadge } from "@/components/kit/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { YEAR_LABELS, type YearLevel } from "@/lib/labels";

/** Server-renderable student profile body shared by Admin and HOD views. */
export function StudentProfile({
  student,
  history,
  attendance,
}: {
  student: {
    name: string;
    email: string;
    rollNumber: string;
    departmentName: string;
    isActive: boolean;
    sectionName: string | null;
    yearLevel: YearLevel | null;
  };
  history: {
    id: string;
    sessionLabel: string;
    sectionName: string;
    yearLevel: YearLevel;
    status: "ACTIVE" | "PROMOTED" | "TRANSFERRED_OUT" | "COMPLETED";
  }[];
  attendance: {
    overall: { present: number; total: number; percentage: number };
    subjects: {
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      present: number;
      total: number;
      percentage: number;
    }[];
  };
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Attendance"
          value={`${attendance.overall.percentage}%`}
          icon={Percent}
        />
        <StatCard
          label="Classes attended"
          value={`${attendance.overall.present}/${attendance.overall.total}`}
          icon={CalendarCheck}
        />
        <StatCard
          label="Current section"
          value={student.sectionName ?? "—"}
          hint={student.yearLevel ? YEAR_LABELS[student.yearLevel] : undefined}
          icon={GraduationCap}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enrollment history</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length ? (
              <ol className="relative space-y-4 border-l pl-4">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {h.sessionLabel}
                      </span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {h.sectionName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {YEAR_LABELS[h.yearLevel]}
                      </span>
                      <Badge
                        variant={h.status === "ACTIVE" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {h.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No enrollments recorded.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Subject attendance (active session)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendance.subjects.length ? (
              attendance.subjects.map((s) => (
                <div key={s.subjectId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {s.subjectName}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.subjectCode}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.present}/{s.total} · {s.percentage}%
                    </span>
                  </div>
                  <Progress value={s.percentage} className="h-2" />
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No attendance yet this session.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function StudentProfileHeaderBadges({
  isActive,
}: {
  isActive: boolean;
}) {
  return <StatusBadge active={isActive} />;
}
