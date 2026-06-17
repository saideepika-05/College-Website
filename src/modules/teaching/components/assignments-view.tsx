"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YEAR_LABELS, type YearLevel } from "@/lib/labels";
import type {
  adminCreateTeacherAssignment,
  adminRemoveTeacherAssignment,
} from "@/modules/teaching/actions";
import { teacherAssignmentSchema } from "@/modules/teaching/schemas";

export type AssignmentRow = {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sectionId: string;
  sectionName: string;
  yearLevel: YearLevel;
  departmentId: string;
  departmentName: string;
};

export type TeacherOption = {
  id: string;
  name: string;
  departmentId: string;
};

export type SubjectOption = {
  id: string;
  name: string;
  code: string;
  yearLevel: YearLevel;
  departmentId: string;
};

export type SectionOption = {
  id: string;
  name: string;
  yearLevel: YearLevel;
  departmentId: string;
  departmentName: string;
};

type FormValues = z.infer<typeof teacherAssignmentSchema>;

export function CreateAssignmentButton({
  teachers,
  subjects,
  sections,
  action,
}: {
  teachers: TeacherOption[];
  subjects: SubjectOption[];
  sections: SectionOption[];
  action: typeof adminCreateTeacherAssignment;
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(action, {
    onSuccess: () => {
      toast.success("Assignment created");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not create assignment"),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(teacherAssignmentSchema),
    defaultValues: { teacherId: "", subjectId: "", sectionId: "" },
  });

  const teacherId = form.watch("teacherId");
  const subjectId = form.watch("subjectId");

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === teacherId),
    [teachers, teacherId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId],
  );

  const subjectOptions = useMemo(
    () =>
      selectedTeacher
        ? subjects.filter(
            (s) => s.departmentId === selectedTeacher.departmentId,
          )
        : subjects,
    [subjects, selectedTeacher],
  );

  const sectionOptions = useMemo(() => {
    let options = sections;
    if (selectedTeacher) {
      options = options.filter(
        (s) => s.departmentId === selectedTeacher.departmentId,
      );
    }
    if (selectedSubject) {
      options = options.filter(
        (s) =>
          s.yearLevel === selectedSubject.yearLevel &&
          s.departmentId === selectedSubject.departmentId,
      );
    }
    return options;
  }, [sections, selectedTeacher, selectedSubject]);

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
      trigger={
        <Button>
          <Plus className="size-4" /> New assignment
        </Button>
      }
      title="New subject assignment"
      description="Assign a teacher to teach a subject for a section in the active session."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(execute)} className="space-y-4">
          <FormField
            control={form.control}
            name="teacherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teacher</FormLabel>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue("subjectId", "");
                    form.setValue("sectionId", "");
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subjectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue("sectionId", "");
                  }}
                  value={field.value}
                  disabled={!teacherId}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          teacherId ? "Select subject" : "Pick a teacher first"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subjectOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.name} ({YEAR_LABELS[s.yearLevel]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sectionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Section</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!subjectId}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          subjectId ? "Select section" : "Pick a subject first"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sectionOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({YEAR_LABELS[s.yearLevel]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isExecuting}>
            {isExecuting && <Loader2 className="size-4 animate-spin" />}
            Create assignment
          </Button>
        </form>
      </Form>
    </FormDialog>
  );
}

function AssignmentRowActions({
  assignment,
  removeAction,
}: {
  assignment: AssignmentRow;
  removeAction: typeof adminRemoveTeacherAssignment;
}) {
  const { executeAsync } = useAction(removeAction, {
    onSuccess: () => toast.success("Assignment removed"),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not remove assignment"),
  });

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" className="size-8">
          <Trash2 className="size-4" />
        </Button>
      }
      title="Remove this assignment?"
      description={`${assignment.teacherName} will no longer teach ${assignment.subjectCode} for section ${assignment.sectionName}.`}
      confirmLabel="Remove"
      destructive
      onConfirm={async () => {
        await executeAsync({ id: assignment.id });
      }}
    />
  );
}

export function AssignmentsTable({
  assignments,
  removeAction,
}: {
  assignments: AssignmentRow[];
  removeAction: typeof adminRemoveTeacherAssignment;
}) {
  const columns: ColumnDef<AssignmentRow, unknown>[] = [
    {
      accessorKey: "teacherName",
      header: "Teacher",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.teacherName}</span>
      ),
    },
    {
      accessorKey: "subjectName",
      header: "Subject",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.subjectCode}
          </Badge>
          <span>{row.original.subjectName}</span>
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
    {
      accessorKey: "yearLevel",
      header: "Year",
      cell: ({ row }) => YEAR_LABELS[row.original.yearLevel],
    },
    { accessorKey: "departmentName", header: "Department" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <AssignmentRowActions
            assignment={row.original}
            removeAction={removeAction}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={assignments}
      searchKeys={["teacherName", "subjectName", "subjectCode", "sectionName"]}
      searchPlaceholder="Search assignments…"
      emptyMessage="No subject assignments yet."
    />
  );
}
