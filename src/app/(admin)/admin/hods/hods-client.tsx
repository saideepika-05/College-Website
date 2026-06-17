"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { DataTable } from "@/components/kit/data-table";
import { FormDialog } from "@/components/kit/form-dialog";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  adminCreateHod,
  adminRemoveHod,
  adminResetPassword,
  adminSetUserActive,
} from "@/modules/people/actions";
import { hodCreateSchema } from "@/modules/people/schemas";
import { ResetPasswordDialog } from "@/modules/people/components/students-view";

type HodRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  departmentId: string;
  departmentName: string;
};

export function CreateHodButton({
  departments,
}: {
  departments: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(adminCreateHod, {
    onSuccess: () => {
      toast.success("HOD created");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not create HOD"),
  });

  const form = useForm<z.infer<typeof hodCreateSchema>>({
    resolver: zodResolver(hodCreateSchema),
    defaultValues: { name: "", email: "", departmentId: "", password: "" },
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
      trigger={
        <Button>
          <Plus className="size-4" /> New HOD
        </Button>
      }
      title="New Head of Department"
      description="Departments that already have an HOD are not listed."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(execute)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Dr. Lakshmi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="hod@college.edu" {...field} />
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
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial password</FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isExecuting}>
            {isExecuting && <Loader2 className="size-4 animate-spin" />}
            Create HOD
          </Button>
        </form>
      </Form>
    </FormDialog>
  );
}

function HodRowActions({ hod }: { hod: HodRow }) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { execute: executeSetActive } = useAction(adminSetUserActive, {
    onSuccess: () =>
      toast.success(hod.isActive ? "Account deactivated" : "Account activated"),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update account"),
  });
  const { executeAsync: executeRemove } = useAction(adminRemoveHod, {
    onSuccess: () => toast.success("HOD removed"),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not remove HOD"),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound className="size-4" /> Reset password
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              executeSetActive({ userId: hod.userId, isActive: !hod.isActive })
            }
          >
            {hod.isActive ? (
              <>
                <UserX className="size-4" /> Deactivate
              </>
            ) : (
              <>
                <UserCheck className="size-4" /> Activate
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ConfirmDialog
            trigger={
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => e.preventDefault()}
              >
                <Trash2 className="size-4" /> Remove HOD
              </DropdownMenuItem>
            }
            title={`Remove ${hod.name} as HOD?`}
            description="The department loses its HOD and this account is deactivated. The audit trail is preserved."
            confirmLabel="Remove"
            destructive
            onConfirm={async () => {
              await executeRemove({ id: hod.id });
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <ResetPasswordDialog
        userId={hod.userId}
        personName={hod.name}
        action={adminResetPassword}
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  );
}

export function HodsTable({ hods }: { hods: HodRow[] }) {
  const columns: ColumnDef<HodRow, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "departmentName", header: "Department" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <StatusBadge active={row.original.isActive} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <HodRowActions hod={row.original} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={hods}
      searchKeys={["name", "email", "departmentName"]}
      searchPlaceholder="Search HODs…"
      emptyMessage="No HODs assigned yet."
    />
  );
}
