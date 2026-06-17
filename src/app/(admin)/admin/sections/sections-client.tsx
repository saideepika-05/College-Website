"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Layers, Loader2, Pencil, Plus } from "lucide-react";
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
import { createSection, updateSection } from "@/modules/academic/actions";
import { sectionSchema } from "@/modules/academic/schemas";

type Section = {
  id: string;
  name: string;
  yearLevel: YearLevel;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  academicSessionId: string;
  sessionLabel: string;
  isActive: boolean;
};

type DepartmentOption = {
  id: string;
  name: string;
  branchName: string;
};

type SessionOption = {
  id: string;
  label: string;
  isActive: boolean;
};

type SectionValues = z.infer<typeof sectionSchema>;

function SectionForm({
  defaults,
  departments,
  sessions,
  submitLabel,
  onSubmit,
  pending,
}: {
  defaults: SectionValues;
  departments: DepartmentOption[];
  sessions: SessionOption[];
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: SectionValues) => void;
}) {
  const form = useForm<SectionValues>({
    resolver: zodResolver(sectionSchema),
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
              <FormLabel>Section name</FormLabel>
              <FormControl>
                <Input
                  placeholder="CSE-1A"
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
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} — {d.branchName}
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
        <FormField
          control={form.control}
          name="academicSessionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Academic session</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                      {s.isActive ? " (active)" : ""}
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

export function CreateSectionButton({
  departments,
  sessions,
}: {
  departments: DepartmentOption[];
  sessions: SessionOption[];
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(createSection, {
    onSuccess: () => {
      toast.success("Section created");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not create section"),
  });

  const activeSession = sessions.find((s) => s.isActive);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus className="size-4" /> New section
        </Button>
      }
      title="New section"
      description="Add a class section to a department."
    >
      <SectionForm
        defaults={{
          name: "",
          departmentId: "",
          yearLevel: "YEAR_1",
          academicSessionId: activeSession?.id ?? "",
        }}
        departments={departments}
        sessions={sessions}
        submitLabel="Create section"
        pending={isExecuting}
        onSubmit={execute}
      />
    </FormDialog>
  );
}

function EditSectionButton({
  section,
  departments,
  sessions,
}: {
  section: Section;
  departments: DepartmentOption[];
  sessions: SessionOption[];
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(updateSection, {
    onSuccess: () => {
      toast.success("Section updated");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update section"),
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
      title="Edit section"
    >
      <SectionForm
        defaults={{
          name: section.name,
          departmentId: section.departmentId,
          yearLevel: section.yearLevel,
          academicSessionId: section.academicSessionId,
        }}
        departments={departments}
        sessions={sessions}
        submitLabel="Save changes"
        pending={isExecuting}
        onSubmit={(values) => execute({ id: section.id, ...values })}
      />
    </FormDialog>
  );
}

export function SectionsTable({
  sections,
  departments,
  sessions,
}: {
  sections: Section[];
  departments: DepartmentOption[];
  sessions: SessionOption[];
}) {
  const columns: ColumnDef<Section, unknown>[] = [
    {
      accessorKey: "name",
      header: "Section",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          <Layers className="size-4 text-muted-foreground" />
          {row.original.name}
        </div>
      ),
    },
    { accessorKey: "departmentName", header: "Department" },
    {
      accessorKey: "yearLevel",
      header: "Year",
      cell: ({ row }) => YEAR_LABELS[row.original.yearLevel],
    },
    {
      accessorKey: "sessionLabel",
      header: "Session",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.sessionLabel}</span>
      ),
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
            entity="section"
            isActive={row.original.isActive}
          />
          <EditSectionButton
            section={row.original}
            departments={departments}
            sessions={sessions}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={sections}
      searchKeys={["name", "departmentName", "sessionLabel"]}
      searchPlaceholder="Search sections…"
      emptyMessage="No sections yet. Create the first one."
    />
  );
}
