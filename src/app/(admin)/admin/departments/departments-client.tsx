"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Pencil, Plus, School } from "lucide-react";
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
import { createDepartment, updateDepartment } from "@/modules/academic/actions";
import { departmentSchema } from "@/modules/academic/schemas";

type Department = {
  id: string;
  name: string;
  code: string;
  branchId: string;
  branchName: string;
  isActive: boolean;
};

type BranchOption = { id: string; name: string };

type DepartmentValues = z.infer<typeof departmentSchema>;

function DepartmentForm({
  defaults,
  branches,
  submitLabel,
  onSubmit,
  pending,
}: {
  defaults: DepartmentValues;
  branches: BranchOption[];
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: DepartmentValues) => void;
}) {
  const form = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
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
              <FormLabel>Department name</FormLabel>
              <FormControl>
                <Input placeholder="Computer Science" {...field} />
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
              <FormLabel>Department code</FormLabel>
              <FormControl>
                <Input
                  placeholder="CSE"
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
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
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

export function CreateDepartmentButton({
  branches,
}: {
  branches: BranchOption[];
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(createDepartment, {
    onSuccess: () => {
      toast.success("Department created");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not create department"),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus className="size-4" /> New department
        </Button>
      }
      title="New department"
      description="Add a department to a branch."
    >
      <DepartmentForm
        defaults={{ name: "", code: "", branchId: "" }}
        branches={branches}
        submitLabel="Create department"
        pending={isExecuting}
        onSubmit={execute}
      />
    </FormDialog>
  );
}

function EditDepartmentButton({
  department,
  branches,
}: {
  department: Department;
  branches: BranchOption[];
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(updateDepartment, {
    onSuccess: () => {
      toast.success("Department updated");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update department"),
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
      title="Edit department"
    >
      <DepartmentForm
        defaults={{
          name: department.name,
          code: department.code,
          branchId: department.branchId,
        }}
        branches={branches}
        submitLabel="Save changes"
        pending={isExecuting}
        onSubmit={(values) => execute({ id: department.id, ...values })}
      />
    </FormDialog>
  );
}

export function DepartmentsTable({
  departments,
  branches,
}: {
  departments: Department[];
  branches: BranchOption[];
}) {
  const columns: ColumnDef<Department, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          <School className="size-4 text-muted-foreground" />
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
    { accessorKey: "branchName", header: "Branch" },
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
            entity="department"
            isActive={row.original.isActive}
          />
          <EditDepartmentButton department={row.original} branches={branches} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={departments}
      searchKeys={["name", "code", "branchName"]}
      searchPlaceholder="Search departments…"
      emptyMessage="No departments yet. Create the first one."
    />
  );
}
