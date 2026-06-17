"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Loader2, Pencil, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createBranch, updateBranch } from "@/modules/academic/actions";
import { branchSchema } from "@/modules/academic/schemas";

type Branch = {
  id: string;
  name: string;
  code: string;
  address: string;
  isActive: boolean;
};

type BranchValues = z.infer<typeof branchSchema>;

function BranchForm({
  defaults,
  submitLabel,
  onSubmit,
  pending,
}: {
  defaults: BranchValues;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: BranchValues) => void;
}) {
  const form = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
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
              <FormLabel>Branch name</FormLabel>
              <FormControl>
                <Input placeholder="Hyderabad Branch" {...field} />
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
              <FormLabel>Branch code</FormLabel>
              <FormControl>
                <Input
                  placeholder="HYD"
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
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Street, city, PIN" {...field} />
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

export function CreateBranchButton() {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(createBranch, {
    onSuccess: () => {
      toast.success("Branch created");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not create branch"),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus className="size-4" /> New branch
        </Button>
      }
      title="New branch"
      description="Add a campus to the institution."
    >
      <BranchForm
        defaults={{ name: "", code: "", address: "" }}
        submitLabel="Create branch"
        pending={isExecuting}
        onSubmit={execute}
      />
    </FormDialog>
  );
}

function EditBranchButton({ branch }: { branch: Branch }) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(updateBranch, {
    onSuccess: () => {
      toast.success("Branch updated");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update branch"),
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
      title="Edit branch"
    >
      <BranchForm
        defaults={{
          name: branch.name,
          code: branch.code,
          address: branch.address,
        }}
        submitLabel="Save changes"
        pending={isExecuting}
        onSubmit={(values) => execute({ id: branch.id, ...values })}
      />
    </FormDialog>
  );
}

export function BranchesTable({ branches }: { branches: Branch[] }) {
  const columns: ColumnDef<Branch, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          <Building2 className="size-4 text-muted-foreground" />
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
    { accessorKey: "address", header: "Address" },
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
            entity="branch"
            isActive={row.original.isActive}
          />
          <EditBranchButton branch={row.original} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={branches}
      searchKeys={["name", "code", "address"]}
      searchPlaceholder="Search branches…"
      emptyMessage="No branches yet. Create the first one."
    />
  );
}
