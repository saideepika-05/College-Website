"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/kit/data-table";
import { FormDialog } from "@/components/kit/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AuditLogRow } from "@/modules/audit/queries";

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
  DELETE: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
  DEACTIVATE: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  PASSWORD_RESET: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-900",
};

function DetailDialog({ row }: { row: AuditLogRow }) {
  const [open, setOpen] = useState(false);
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="icon" className="size-8">
          <Eye className="size-4" />
        </Button>
      }
      title={`${row.action} · ${row.entityType}`}
      description={`${row.actorName ?? "System"} · ${row.createdAt.toLocaleString("en-IN")}`}
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Before
          </p>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
            {row.before ? JSON.stringify(row.before, null, 2) : "—"}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            After
          </p>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
            {row.after ? JSON.stringify(row.after, null, 2) : "—"}
          </pre>
        </div>
      </div>
    </FormDialog>
  );
}

export function AuditTable({ logs }: { logs: AuditLogRow[] }) {
  const columns: ColumnDef<AuditLogRow, unknown>[] = [
    {
      accessorKey: "createdAt",
      header: "When",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {row.original.createdAt.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      accessorKey: "actorName",
      header: "Actor",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.actorName ?? "System"}</span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={ACTION_STYLES[row.original.action] ?? ""}
        >
          {row.original.action}
        </Badge>
      ),
    },
    { accessorKey: "entityType", header: "Entity" },
    {
      accessorKey: "departmentName",
      header: "Department",
      cell: ({ row }) => row.original.departmentName ?? "—",
    },
    {
      id: "detail",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DetailDialog row={row.original} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={logs}
      searchKeys={["actorName", "action", "entityType", "departmentName"]}
      searchPlaceholder="Search audit trail…"
      pageSize={30}
      emptyMessage="No audit entries yet."
    />
  );
}
