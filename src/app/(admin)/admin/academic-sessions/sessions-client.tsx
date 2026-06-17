"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarRange, Loader2, Pencil, Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { DataTable } from "@/components/kit/data-table";
import { FormDialog } from "@/components/kit/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/labels";
import {
  activateAcademicSession,
  createAcademicSession,
  updateAcademicSession,
} from "@/modules/academic/actions";
import { academicSessionSchema } from "@/modules/academic/schemas";

type Session = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type SessionValues = z.infer<typeof academicSessionSchema>;

function SessionForm({
  defaults,
  submitLabel,
  onSubmit,
  pending,
}: {
  defaults: SessionValues;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: SessionValues) => void;
}) {
  const form = useForm<SessionValues>({
    resolver: zodResolver(academicSessionSchema),
    defaultValues: defaults,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session label</FormLabel>
              <FormControl>
                <Input placeholder="2026-2027" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}

export function CreateSessionButton() {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(createAcademicSession, {
    onSuccess: () => {
      toast.success("Academic session created");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not create academic session"),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus className="size-4" /> New session
        </Button>
      }
      title="New academic session"
      description="Add a yearly academic session."
    >
      <SessionForm
        defaults={{ label: "", startDate: "", endDate: "" }}
        submitLabel="Create session"
        pending={isExecuting}
        onSubmit={execute}
      />
    </FormDialog>
  );
}

function EditSessionButton({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(updateAcademicSession, {
    onSuccess: () => {
      toast.success("Academic session updated");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update academic session"),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="icon" className="size-8">
          <Pencil className="size-4" />
        </Button>
      }
      title="Edit academic session"
    >
      <SessionForm
        defaults={{
          label: session.label,
          startDate: session.startDate,
          endDate: session.endDate,
        }}
        submitLabel="Save changes"
        pending={isExecuting}
        onSubmit={(values) => execute({ id: session.id, ...values })}
      />
    </FormDialog>
  );
}

function ActivateSessionButton({ session }: { session: Session }) {
  const { execute } = useAction(activateAcademicSession, {
    onSuccess: () => toast.success(`${session.label} is now active`),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not activate session"),
  });

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          Set active
        </Button>
      }
      title={`Activate ${session.label}?`}
      description={`All portals will switch to the ${session.label} session. The currently active session will be deactivated.`}
      confirmLabel="Set active"
      onConfirm={() => execute({ id: session.id })}
    />
  );
}

export function SessionsTable({ sessions }: { sessions: Session[] }) {
  const columns: ColumnDef<Session, unknown>[] = [
    {
      accessorKey: "label",
      header: "Session",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          <CalendarRange className="size-4 text-muted-foreground" />
          {row.original.label}
          {row.original.isActive && (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
            >
              Active
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Starts",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "endDate",
      header: "Ends",
      cell: ({ row }) => formatDate(row.original.endDate),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {!row.original.isActive && (
            <ActivateSessionButton session={row.original} />
          )}
          <EditSessionButton session={row.original} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={sessions}
      searchKeys={["label"]}
      searchPlaceholder="Search sessions…"
      emptyMessage="No academic sessions yet. Create the first one."
    />
  );
}
