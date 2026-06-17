"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import type {
  adminCreateTeacher,
  adminResetPassword,
  adminSetUserActive,
  adminUpdateTeacher,
} from "@/modules/people/actions";
import {
  teacherCreateSchema,
  teacherUpdateSchema,
} from "@/modules/people/schemas";
import {
  ResetPasswordDialog,
  type DepartmentOption,
} from "./students-view";

export type TeacherRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  departmentId: string;
  departmentName: string;
};

type TeachersActions = {
  create: typeof adminCreateTeacher;
  update: typeof adminUpdateTeacher;
  setActive: typeof adminSetUserActive;
  resetPassword: typeof adminResetPassword;
};

export function CreateTeacherButton({
  departments,
  actions,
}: {
  departments: DepartmentOption[];
  actions: TeachersActions;
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(actions.create, {
    onSuccess: () => {
      toast.success("Teacher created");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not create teacher"),
  });

  const form = useForm<z.infer<typeof teacherCreateSchema>>({
    resolver: zodResolver(teacherCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      departmentId: departments.length === 1 ? departments[0]!.id : "",
      password: "",
    },
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
          <Plus className="size-4" /> New teacher
        </Button>
      }
      title="New teacher"
      description="Creates the teacher's login in the selected department."
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
                  <Input placeholder="Prof. Rao" {...field} />
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
                  <Input
                    type="email"
                    placeholder="teacher@college.edu"
                    {...field}
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
                  <Input
                    type="text"
                    autoComplete="off"
                    placeholder="Share securely with the teacher"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isExecuting}>
            {isExecuting && <Loader2 className="size-4 animate-spin" />}
            Create teacher
          </Button>
        </form>
      </Form>
    </FormDialog>
  );
}

function EditTeacherDialog({
  teacher,
  actions,
  open,
  onOpenChange,
}: {
  teacher: TeacherRow;
  actions: TeachersActions;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { execute, isExecuting } = useAction(actions.update, {
    onSuccess: () => {
      toast.success("Teacher updated");
      onOpenChange(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update teacher"),
  });

  const form = useForm<z.infer<typeof teacherUpdateSchema>>({
    resolver: zodResolver(teacherUpdateSchema),
    defaultValues: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
    },
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Edit teacher">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(execute)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Input type="email" {...field} />
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

function TeacherRowActions({
  teacher,
  actions,
}: {
  teacher: TeacherRow;
  actions: TeachersActions;
}) {
  const [dialog, setDialog] = useState<"edit" | "password" | null>(null);
  const { execute: executeSetActive } = useAction(actions.setActive, {
    onSuccess: () =>
      toast.success(
        teacher.isActive ? "Account deactivated" : "Account activated",
      ),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update account"),
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
          <DropdownMenuItem onClick={() => setDialog("edit")}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("password")}>
            <KeyRound className="size-4" /> Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={teacher.isActive ? "destructive" : "default"}
            onClick={() =>
              executeSetActive({
                userId: teacher.userId,
                isActive: !teacher.isActive,
              })
            }
          >
            {teacher.isActive ? (
              <>
                <UserX className="size-4" /> Deactivate
              </>
            ) : (
              <>
                <UserCheck className="size-4" /> Activate
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditTeacherDialog
        teacher={teacher}
        actions={actions}
        open={dialog === "edit"}
        onOpenChange={(o) => setDialog(o ? "edit" : null)}
      />
      <ResetPasswordDialog
        userId={teacher.userId}
        personName={teacher.name}
        action={actions.resetPassword}
        open={dialog === "password"}
        onOpenChange={(o) => setDialog(o ? "password" : null)}
      />
    </>
  );
}

export function TeachersTable({
  teachers,
  actions,
}: {
  teachers: TeacherRow[];
  actions: TeachersActions;
}) {
  const columns: ColumnDef<TeacherRow, unknown>[] = [
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
          <TeacherRowActions teacher={row.original} actions={actions} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={teachers}
      searchKeys={["name", "email", "departmentName"]}
      searchPlaceholder="Search teachers…"
      emptyMessage="No teachers found."
    />
  );
}
