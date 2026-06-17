"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/kit/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/labels";
import { periodLabel } from "@/modules/attendance/periods";
import type { AttendanceSessionListRow } from "@/modules/attendance/queries";

export function SessionsTable({
  sessions,
  hrefBase,
}: {
  sessions: AttendanceSessionListRow[];
  hrefBase: string;
}) {
  const columns: ColumnDef<AttendanceSessionListRow, unknown>[] = [
    {
      accessorKey: "classDate",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.classDate),
    },
    {
      accessorKey: "periodNo",
      header: "Period",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm tabular-nums">
          {periodLabel(row.original.periodNo)}
        </span>
      ),
    },
    {
      accessorKey: "subjectName",
      header: "Subject",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.subjectName}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {row.original.subjectCode}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "sectionName",
      header: "Section",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.sectionName}</Badge>
      ),
    },
    { accessorKey: "teacherName", header: "Teacher" },
    {
      id: "presence",
      header: "Present",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.presentCount}
          {row.original.totalCount > 0 && (
            <span className="text-muted-foreground">
              {" "}
              / {row.original.totalCount}
            </span>
          )}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "OPEN" ? (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
            Live
          </Badge>
        ) : (
          <Badge variant="outline">Closed</Badge>
        ),
    },
    {
      id: "open",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button asChild variant="ghost" size="icon" className="size-8">
            <Link href={`${hrefBase}/${row.original.id}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={sessions}
      searchKeys={["subjectName", "subjectCode", "sectionName", "teacherName"]}
      searchPlaceholder="Search sessions…"
      emptyMessage="No attendance sessions yet."
    />
  );
}
