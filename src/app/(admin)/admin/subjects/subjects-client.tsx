"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, Loader2, Pencil, Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ActiveSwitch } from "@/components/kit/active-switch";
import { DataTable } from "@/components/kit/data-table";
import { FormDialog } from "@/components/kit/form-dialog";
import { StatusBadge } from "@/components/kit/status-badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YEAR_LABELS, YEAR_LEVELS, type YearLevel } from "@/lib/labels";
import { createSubject, updateSubject } from "@/modules/academic/actions";
import { subjectSchema } from "@/modules/academic/schemas";

type Subject = {
  id: string;
  name: string;
  code: string;
  yearLevel: YearLevel;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
};

type DepartmentOption = { id: string; name: string; branchName: string };

type SubjectValues = z.infer<typeof subjectSchema>;

function SubjectForm({
  defaults,
  departments,
  submitLabel,
  onSubmit,
  pending,
}: {
  defaults: SubjectValues;
  departments: DepartmentOption[];
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: SubjectValues) => void;
}) {
  const form = useForm<SubjectValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: defaults,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject name</FormLabel>
              <FormControl>
                <Input placeholder="Data Structures" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject code</FormLabel>
              <FormControl>
                <Input
                  placeholder="CS201"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name} — {department.branchName}
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
          name="yearLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a year" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {YEAR_LEVELS.map((year) => (
                    <SelectItem key={year} value={year}>
                      {YEAR_LABELS[year]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

export function CreateSubjectButton({
  departments,
}: {
  departments: DepartmentOption[];
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(createSubject, {
    onSuccess: () => {
      toast.success("Subject created");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not create subject"),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus className="size-4" /> New subject
        </Button>
      }
      title="New subject"
      description="Add a subject to a department and year."
    >
      <SubjectForm
        defaults={{ name: "", code: "", departmentId: "", yearLevel: "YEAR_1" }}
        departments={departments}
        submitLabel="Create subject"
        pending={isExecuting}
        onSubmit={execute}
      />
    </FormDialog>
  );
}

function EditSubjectButton({
  subject,
  departments,
}: {
  subject: Subject;
  departments: DepartmentOption[];
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(updateSubject, {
    onSuccess: () => {
      toast.success("Subject updated");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update subject"),
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
      title="Edit subject"
    >
      <SubjectForm
        defaults={{
          name: subject.name,
          code: subject.code,
          departmentId: subject.departmentId,
          yearLevel: subject.yearLevel,
        }}
        departments={departments}
        submitLabel="Save changes"
        pending={isExecuting}
        onSubmit={(values) => execute({ id: subject.id, ...values })}
      />
    </FormDialog>
  );
}

export function SubjectsTable({
  subjects,
  departments,
}: {
  subjects: Subject[];
  departments: DepartmentOption[];
}) {
  const columns: ColumnDef<Subject, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          <BookOpen className="size-4 text-muted-foreground" />
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.code}</span>
      ),
    },
    { accessorKey: "departmentName", header: "Department" },
    {
      accessorKey: "yearLevel",
      header: "Year",
      cell: ({ row }) => YEAR_LABELS[row.original.yearLevel],
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <StatusBadge active={row.original.isActive} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <ActiveSwitch
            id={row.original.id}
            entity="subject"
            isActive={row.original.isActive}
          />
          <EditSubjectButton subject={row.original} departments={departments} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={subjects}
      searchKeys={["name", "code", "departmentName"]}
      searchPlaceholder="Search subjects…"
      emptyMessage="No subjects yet. Create the first one."
    />
  );
}
