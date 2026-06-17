"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { DataTable } from "@/components/kit/data-table";
import { EmptyState } from "@/components/kit/empty-state";
import { FormDialog } from "@/components/kit/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, YEAR_LABELS } from "@/lib/labels";
import type {
  adminCreateAssignment,
  adminDeleteAssignment,
  adminUpdateAssignment,
} from "@/modules/coursework/actions";
import {
  assignmentCreateSchema,
  assignmentUpdateSchema,
} from "@/modules/coursework/schemas";

export type AssignmentRow = {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  assignedDate: string;
  dueDate: string;
  createdByName: string;
  targetSections: string[];
  targetSectionIds: string[];
};

export type SubjectOption = {
  id: string;
  name: string;
  code: string;
  yearLevel: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4";
  departmentId: string;
};

export type SectionOption = {
  id: string;
  name: string;
  yearLevel: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4";
  departmentId: string;
};

type CreateValues = z.infer<typeof assignmentCreateSchema>;
type UpdateValues = z.infer<typeof assignmentUpdateSchema>;

function localToday(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function SectionMultiSelect({
  options,
  selected,
  onChange,
  hint,
}: {
  options: SectionOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  hint: string;
}) {
  const allSelected =
    options.length > 0 && options.every((s) => selected.includes(s.id));

  return (
    <div className="max-h-48 overflow-y-auto rounded-md border">
      {options.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground">{hint}</p>
      ) : (
        <div className="divide-y">
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-2">
            <Checkbox
              id="coursework-sections-all"
              checked={allSelected}
              onCheckedChange={(checked) =>
                onChange(checked ? options.map((s) => s.id) : [])
              }
            />
            <Label
              htmlFor="coursework-sections-all"
              className="text-sm font-medium"
            >
              Select all
            </Label>
          </div>
          {options.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-2">
              <Checkbox
                id={`coursework-section-${s.id}`}
                checked={selected.includes(s.id)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...selected, s.id]
                      : selected.filter((id) => id !== s.id),
                  )
                }
              />
              <Label
                htmlFor={`coursework-section-${s.id}`}
                className="text-sm font-normal"
              >
                {s.name} · {YEAR_LABELS[s.yearLevel]}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentForm({
  subjects,
  sections,
  onSubmit,
  isExecuting,
  defaultSubjectFilter,
}: {
  subjects: SubjectOption[];
  sections: SectionOption[];
  onSubmit: (values: CreateValues) => void;
  isExecuting: boolean;
  defaultSubjectFilter?: string;
}) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(assignmentCreateSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: defaultSubjectFilter ?? "",
      dueDate: "",
      sectionIds: [],
    },
  });

  const subjectId = form.watch("subjectId");
  const sectionIds = form.watch("sectionIds");
  const subject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId],
  );
  const sectionOptions = useMemo(
    () =>
      subject
        ? sections.filter(
            (s) =>
              s.departmentId === subject.departmentId &&
              s.yearLevel === subject.yearLevel,
          )
        : [],
    [sections, subject],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="subjectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <Select
                onValueChange={(v) => {
                  field.onChange(v);
                  form.setValue("sectionIds", []);
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subjects.map((s) => (
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
          name="sectionIds"
          render={() => (
            <FormItem>
              <FormLabel>Sections</FormLabel>
              <SectionMultiSelect
                options={sectionOptions}
                selected={sectionIds}
                onChange={(next) =>
                  form.setValue("sectionIds", next, { shouldValidate: true })
                }
                hint={
                  subject
                    ? "No active sections match this subject's department and year."
                    : "Pick a subject first."
                }
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Chapter 4 problem set" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Instructions, references, marks…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
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
  );
}

export function CreateAssignmentButton({
  subjects,
  sections,
  action,
  defaultSubjectFilter,
}: {
  subjects: SubjectOption[];
  sections: SectionOption[];
  action: typeof adminCreateAssignment;
  defaultSubjectFilter?: string;
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

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus className="size-4" /> New assignment
        </Button>
      }
      title="New assignment"
      description="Posts a homework assignment to the selected sections."
    >
      {open ? (
        <AssignmentForm
          subjects={subjects}
          sections={sections}
          onSubmit={execute}
          isExecuting={isExecuting}
          defaultSubjectFilter={defaultSubjectFilter}
        />
      ) : null}
    </FormDialog>
  );
}

function EditAssignmentDialog({
  assignment,
  action,
  open,
  onOpenChange,
}: {
  assignment: AssignmentRow;
  action: typeof adminUpdateAssignment;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { execute, isExecuting } = useAction(action, {
    onSuccess: () => {
      toast.success("Assignment updated");
      onOpenChange(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update assignment"),
  });

  const form = useForm<UpdateValues>({
    resolver: zodResolver(assignmentUpdateSchema),
    defaultValues: {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
    },
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Edit assignment">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(execute)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isExecuting}>
            {isExecuting && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </form>
      </Form>
    </FormDialog>
  );
}

function AssignmentRowActions({
  assignment,
  updateAction,
  deleteAction,
}: {
  assignment: AssignmentRow;
  updateAction: typeof adminUpdateAssignment;
  deleteAction: typeof adminDeleteAssignment;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const { executeAsync: executeDelete } = useAction(deleteAction, {
    onSuccess: () => toast.success("Assignment deleted"),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not delete assignment"),
  });

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-4" />
        <span className="sr-only">Edit</span>
      </Button>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon" className="size-8">
            <Trash2 className="size-4" />
            <span className="sr-only">Delete</span>
          </Button>
        }
        title="Delete assignment?"
        description={`"${assignment.title}" will be removed for all targeted sections.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await executeDelete({ id: assignment.id });
        }}
      />
      {editOpen ? (
        <EditAssignmentDialog
          assignment={assignment}
          action={updateAction}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </div>
  );
}

export function AssignmentsTable({
  assignments,
  updateAction,
  deleteAction,
}: {
  assignments: AssignmentRow[];
  updateAction?: typeof adminUpdateAssignment;
  deleteAction?: typeof adminDeleteAssignment;
}) {
  const today = localToday();

  const columns: ColumnDef<AssignmentRow, unknown>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="font-medium">{row.original.title}</p>
          {row.original.description ? (
            <p className="truncate text-xs text-muted-foreground">
              {row.original.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "subjectName",
      header: "Subject",
      cell: ({ row }) => (
        <div>
          <span className="font-mono text-xs">{row.original.subjectCode}</span>
          <p className="text-xs text-muted-foreground">
            {row.original.subjectName}
          </p>
        </div>
      ),
    },
    {
      id: "sections",
      header: "Sections",
      cell: ({ row }) => (
        <div className="flex max-w-48 flex-wrap gap-1">
          {row.original.targetSections.map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => (
        <span
          className={
            row.original.dueDate < today ? "text-destructive" : undefined
          }
        >
          {formatDate(row.original.dueDate)}
        </span>
      ),
    },
    { accessorKey: "createdByName", header: "Created by" },
    ...(updateAction && deleteAction
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }) => (
              <AssignmentRowActions
                assignment={row.original}
                updateAction={updateAction}
                deleteAction={deleteAction}
              />
            ),
          } satisfies ColumnDef<AssignmentRow, unknown>,
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={assignments}
      searchKeys={["title", "subjectName", "subjectCode"]}
      searchPlaceholder="Search assignments…"
      emptyMessage="No assignments found."
    />
  );
}

export function AssignmentsFeed({
  assignments,
}: {
  assignments: AssignmentRow[];
}) {
  const today = localToday();

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No assignments yet"
        description="Homework posted to your section will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((a) => {
        const overdue = a.dueDate < today;
        return (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-medium">
                  {a.title}
                </CardTitle>
                <Badge variant="outline" className="font-mono">
                  {a.subjectCode}
                </Badge>
              </div>
              <CardDescription>
                {a.subjectName} ·{" "}
                <span className={overdue ? "text-destructive" : undefined}>
                  Due {formatDate(a.dueDate)}
                </span>{" "}
                · by {a.createdByName}
              </CardDescription>
            </CardHeader>
            {a.description ? (
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{a.description}</p>
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
