"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowRightLeft,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  UserX,
  UserCheck,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/kit/data-table";
import { FormDialog } from "@/components/kit/form-dialog";
import { StatusBadge } from "@/components/kit/status-badge";
import { Badge } from "@/components/ui/badge";
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
import { YEAR_LABELS } from "@/lib/labels";
import type {
  adminCreateStudent,
  adminResetPassword,
  adminSetUserActive,
  adminTransferStudent,
  adminUpdateStudent,
} from "@/modules/people/actions";
import {
  studentCreateSchema,
  studentUpdateSchema,
} from "@/modules/people/schemas";

export type StudentRow = {
  id: string;
  userId: string;
  rollNumber: string;
  name: string;
  email: string;
  isActive: boolean;
  departmentId: string;
  departmentName: string;
  sectionId: string | null;
  sectionName: string | null;
  yearLevel: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4" | null;
};

export type SectionOption = {
  id: string;
  name: string;
  yearLevel: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4";
  departmentId: string;
  departmentName: string;
};

export type DepartmentOption = { id: string; name: string };

type StudentsActions = {
  create: typeof adminCreateStudent;
  update: typeof adminUpdateStudent;
  transfer: typeof adminTransferStudent;
  setActive: typeof adminSetUserActive;
  resetPassword: typeof adminResetPassword;
};

type CreateValues = z.infer<typeof studentCreateSchema>;

export function CreateStudentButton({
  departments,
  sections,
  actions,
}: {
  departments: DepartmentOption[];
  sections: SectionOption[];
  actions: StudentsActions;
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(actions.create, {
    onSuccess: () => {
      toast.success("Student created and enrolled");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not create student"),
  });

  const form = useForm<CreateValues>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      rollNumber: "",
      departmentId: departments.length === 1 ? departments[0]!.id : "",
      sectionId: "",
      password: "",
    },
  });

  const departmentId = form.watch("departmentId");
  const sectionOptions = useMemo(
    () => sections.filter((s) => s.departmentId === departmentId),
    [sections, departmentId],
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
      trigger={
        <Button>
          <Plus className="size-4" /> New student
        </Button>
      }
      title="New student"
      description="Creates the login and enrolls the student in the active session."
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
                  <Input placeholder="Ananya Sharma" {...field} />
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
                    placeholder="student@college.edu"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rollNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Roll number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="CSE26001"
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
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
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue("sectionId", "");
                  }}
                  value={field.value}
                >
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
            name="sectionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Section (active session)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!departmentId}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          departmentId
                            ? "Select section"
                            : "Pick a department first"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sectionOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {YEAR_LABELS[s.yearLevel]}
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
                    placeholder="Share securely with the student"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isExecuting}>
            {isExecuting && <Loader2 className="size-4 animate-spin" />}
            Create student
          </Button>
        </form>
      </Form>
    </FormDialog>
  );
}

function EditStudentDialog({
  student,
  actions,
  open,
  onOpenChange,
}: {
  student: StudentRow;
  actions: StudentsActions;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { execute, isExecuting } = useAction(actions.update, {
    onSuccess: () => {
      toast.success("Student updated");
      onOpenChange(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update student"),
  });

  const form = useForm<z.infer<typeof studentUpdateSchema>>({
    resolver: zodResolver(studentUpdateSchema),
    defaultValues: {
      id: student.id,
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
    },
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Edit student">
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
          <FormField
            control={form.control}
            name="rollNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Roll number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
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

function TransferStudentDialog({
  student,
  sections,
  actions,
  open,
  onOpenChange,
}: {
  student: StudentRow;
  sections: SectionOption[];
  actions: StudentsActions;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [sectionId, setSectionId] = useState("");
  const { execute, isExecuting } = useAction(actions.transfer, {
    onSuccess: () => {
      toast.success("Student transferred");
      onOpenChange(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not transfer student"),
  });

  const options = sections.filter(
    (s) =>
      s.departmentId === student.departmentId &&
      s.yearLevel === student.yearLevel &&
      s.id !== student.sectionId,
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer student"
      description={`Move ${student.name} (${student.rollNumber}) to another section of the same year.`}
    >
      <div className="space-y-4">
        <Select value={sectionId} onValueChange={setSectionId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Destination section" />
          </SelectTrigger>
          <SelectContent>
            {options.length ? (
              options.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {YEAR_LABELS[s.yearLevel]}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="__none" disabled>
                No eligible sections
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          className="w-full"
          disabled={!sectionId || isExecuting}
          onClick={() =>
            execute({ studentId: student.id, newSectionId: sectionId })
          }
        >
          {isExecuting && <Loader2 className="size-4 animate-spin" />}
          Transfer
        </Button>
      </div>
    </FormDialog>
  );
}

export function ResetPasswordDialog({
  userId,
  personName,
  action,
  open,
  onOpenChange,
}: {
  userId: string;
  personName: string;
  action: typeof adminResetPassword;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const { execute, isExecuting } = useAction(action, {
    onSuccess: () => {
      toast.success("Password reset");
      setPassword("");
      onOpenChange(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not reset password"),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reset password"
      description={`Set a new password for ${personName}. Share it securely.`}
    >
      <div className="space-y-4">
        <Input
          type="text"
          autoComplete="off"
          placeholder="New password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          className="w-full"
          disabled={password.length < 8 || isExecuting}
          onClick={() => execute({ userId, newPassword: password })}
        >
          {isExecuting && <Loader2 className="size-4 animate-spin" />}
          Reset password
        </Button>
      </div>
    </FormDialog>
  );
}

function StudentRowActions({
  student,
  sections,
  actions,
}: {
  student: StudentRow;
  sections: SectionOption[];
  actions: StudentsActions;
}) {
  const [dialog, setDialog] = useState<
    "edit" | "transfer" | "password" | null
  >(null);
  const { execute: executeSetActive } = useAction(actions.setActive, {
    onSuccess: () =>
      toast.success(student.isActive ? "Account deactivated" : "Account activated"),
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
          <DropdownMenuItem onClick={() => setDialog("transfer")}>
            <ArrowRightLeft className="size-4" /> Transfer section
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("password")}>
            <KeyRound className="size-4" /> Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={student.isActive ? "destructive" : "default"}
            onClick={() =>
              executeSetActive({
                userId: student.userId,
                isActive: !student.isActive,
              })
            }
          >
            {student.isActive ? (
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
      <EditStudentDialog
        student={student}
        actions={actions}
        open={dialog === "edit"}
        onOpenChange={(o) => setDialog(o ? "edit" : null)}
      />
      <TransferStudentDialog
        student={student}
        sections={sections}
        actions={actions}
        open={dialog === "transfer"}
        onOpenChange={(o) => setDialog(o ? "transfer" : null)}
      />
      <ResetPasswordDialog
        userId={student.userId}
        personName={student.name}
        action={actions.resetPassword}
        open={dialog === "password"}
        onOpenChange={(o) => setDialog(o ? "password" : null)}
      />
    </>
  );
}

export function StudentsTable({
  students,
  sections,
  actions,
  profileHrefBase,
}: {
  students: StudentRow[];
  sections: SectionOption[];
  actions: StudentsActions;
  /** When set, student names link to `${profileHrefBase}/${student.id}`. */
  profileHrefBase?: string;
}) {
  const columns: ColumnDef<StudentRow, unknown>[] = [
    {
      accessorKey: "rollNumber",
      header: "Roll No",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.rollNumber}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          {profileHrefBase ? (
            <Link
              href={`${profileHrefBase}/${row.original.id}`}
              className="font-medium hover:underline"
            >
              {row.original.name}
            </Link>
          ) : (
            <p className="font-medium">{row.original.name}</p>
          )}
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "departmentName", header: "Department" },
    {
      accessorKey: "sectionName",
      header: "Section",
      cell: ({ row }) =>
        row.original.sectionName ? (
          <Badge variant="secondary">{row.original.sectionName}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not enrolled</span>
        ),
    },
    {
      accessorKey: "yearLevel",
      header: "Year",
      cell: ({ row }) =>
        row.original.yearLevel ? YEAR_LABELS[row.original.yearLevel] : "—",
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
        <div className="flex justify-end">
          <StudentRowActions
            student={row.original}
            sections={sections}
            actions={actions}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={students}
      searchKeys={["rollNumber", "name", "email", "departmentName", "sectionName"]}
      searchPlaceholder="Search students…"
      emptyMessage="No students found."
    />
  );
}
