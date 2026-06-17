"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { DataTable } from "@/components/kit/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { teacherEditAttendanceRecord } from "@/modules/attendance/actions";

export type RecordRow = {
  id: string;
  rollNumber: string;
  studentName: string;
  status: "PRESENT" | "ABSENT";
  markedVia: "QR" | "MANUAL";
};

/**
 * Post-session attendance editor. Every flip is audit-logged server-side
 * (who, before, after, when) per SRS §18/§25.
 */
export function RecordsEditor({
  records,
  editAction,
}: {
  records: RecordRow[];
  editAction: typeof teacherEditAttendanceRecord;
}) {
  const { execute, isExecuting } = useAction(editAction, {
    onSuccess: () => toast.success("Attendance updated"),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update the record"),
  });

  const columns: ColumnDef<RecordRow, unknown>[] = [
    {
      accessorKey: "rollNumber",
      header: "Roll No",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.rollNumber}</span>
      ),
    },
    {
      accessorKey: "studentName",
      header: "Student",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.studentName}</span>
      ),
    },
    {
      accessorKey: "markedVia",
      header: "Source",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.markedVia === "QR" ? "QR scan" : "Manual"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={r.status === "PRESENT" ? "default" : "outline"}
              disabled={isExecuting || r.status === "PRESENT"}
              className={cn(
                "h-7 px-2 text-xs",
                r.status === "PRESENT" &&
                  "bg-emerald-600 hover:bg-emerald-600 text-white",
              )}
              onClick={() => execute({ recordId: r.id, status: "PRESENT" })}
            >
              Present
            </Button>
            <Button
              size="sm"
              variant={r.status === "ABSENT" ? "destructive" : "outline"}
              disabled={isExecuting || r.status === "ABSENT"}
              className="h-7 px-2 text-xs"
              onClick={() => execute({ recordId: r.id, status: "ABSENT" })}
            >
              Absent
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={records}
      searchKeys={["rollNumber", "studentName"]}
      searchPlaceholder="Search students…"
      pageSize={50}
      emptyMessage="No attendance records."
    />
  );
}
