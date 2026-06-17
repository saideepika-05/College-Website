"use client";

import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YEAR_LABELS } from "@/lib/labels";

type SectionOption = {
  id: string;
  name: string;
  departmentName: string;
  yearLevel: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4";
};

type DepartmentOption = { id: string; name: string };

const FORMATS = [
  { format: "csv", label: "CSV", Icon: FileText },
  { format: "xlsx", label: "Excel", Icon: FileSpreadsheet },
  { format: "pdf", label: "PDF", Icon: FileDown },
] as const;

/** Three download buttons, or disabled placeholders when there's no target. */
function DownloadButtons({ buildHref }: { buildHref: ((format: string) => string) | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FORMATS.map(({ format, label, Icon }) =>
        buildHref ? (
          <Button key={format} variant="outline" size="sm" asChild>
            <a href={buildHref(format)} download>
              <Icon />
              {label}
            </a>
          </Button>
        ) : (
          <Button key={format} variant="outline" size="sm" disabled>
            <Icon />
            {label}
          </Button>
        ),
      )}
    </div>
  );
}

const ALL_DEPARTMENTS = "__all__";

/** Card with an optional "All departments" select + download buttons. */
function DepartmentReportCard({
  title,
  description,
  endpoint,
  departments,
}: {
  title: string;
  description: string;
  endpoint: string;
  departments: DepartmentOption[];
}) {
  const [departmentId, setDepartmentId] = useState<string>(ALL_DEPARTMENTS);

  const buildHref = (format: string) => {
    const params = new URLSearchParams({ format });
    if (departmentId !== ALL_DEPARTMENTS) {
      params.set("departmentId", departmentId);
    }
    return `${endpoint}?${params.toString()}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DownloadButtons buildHref={buildHref} />
      </CardContent>
    </Card>
  );
}

export function ReportsView({
  sections,
  departments,
}: {
  sections: SectionOption[];
  departments: DepartmentOption[];
  basePath?: string;
}) {
  const [sectionId, setSectionId] = useState<string>("");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Section Attendance</CardTitle>
          <CardDescription>
            Per-student attendance summary for one section.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {YEAR_LABELS[s.yearLevel]} · {s.departmentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DownloadButtons
            buildHref={
              sectionId
                ? (format) =>
                    `/api/exports/section-attendance?sectionId=${sectionId}&format=${format}`
                : null
            }
          />
        </CardContent>
      </Card>

      <DepartmentReportCard
        title="Student Roster"
        description="All students with department, section and year."
        endpoint="/api/exports/student-roster"
        departments={departments}
      />

      <DepartmentReportCard
        title="Teacher Roster"
        description="All teachers with department and status."
        endpoint="/api/exports/teacher-roster"
        departments={departments}
      />

      <DepartmentReportCard
        title="Assignments"
        description="Assignments in the active academic session."
        endpoint="/api/exports/assignments"
        departments={departments}
      />
    </div>
  );
}
