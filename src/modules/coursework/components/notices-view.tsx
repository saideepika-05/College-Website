"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Megaphone, Plus, X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { EmptyState } from "@/components/kit/empty-state";
import { FormDialog } from "@/components/kit/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/labels";
import type {
  adminCreateNotice,
  adminDeactivateNotice,
} from "@/modules/coursework/actions";
import { noticeCreateSchema } from "@/modules/coursework/schemas";

export type NoticeItem = {
  id: string;
  title: string;
  body: string;
  type: "INSTITUTION" | "DEPARTMENT" | "SECTION";
  departmentId: string | null;
  createdById: string;
  createdByName: string;
  createdAt: Date;
  isActive: boolean;
  targetSections: string[];
};

export type NoticeSectionOption = { id: string; name: string };

type NoticeValues = z.infer<typeof noticeCreateSchema>;

const TYPE_LABELS: Record<NoticeItem["type"], string> = {
  INSTITUTION: "Institution",
  DEPARTMENT: "Department",
  SECTION: "Section",
};

const TYPE_VARIANTS: Record<
  NoticeItem["type"],
  "default" | "secondary" | "outline"
> = {
  INSTITUTION: "default",
  DEPARTMENT: "secondary",
  SECTION: "outline",
};

export function CreateNoticeButton({
  action,
  sections = [],
  requireSections = false,
}: {
  action: typeof adminCreateNotice;
  sections?: NoticeSectionOption[];
  requireSections?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting } = useAction(action, {
    onSuccess: () => {
      toast.success("Notice published");
      setOpen(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not publish notice"),
  });

  const form = useForm<NoticeValues>({
    resolver: zodResolver(noticeCreateSchema),
    defaultValues: { title: "", body: "", sectionIds: [] },
  });

  const selected = form.watch("sectionIds") ?? [];
  const allSelected =
    sections.length > 0 && sections.every((s) => selected.includes(s.id));

  const onSubmit = (values: NoticeValues) => {
    if (requireSections && (values.sectionIds?.length ?? 0) === 0) {
      form.setError("sectionIds", { message: "Pick at least one section" });
      return;
    }
    execute(values);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
      trigger={
        <Button>
          <Plus className="size-4" /> New notice
        </Button>
      }
      title="New notice"
      description={
        requireSections
          ? "Publishes a notice to the selected sections."
          : "Publishes a notice to its audience immediately."
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Mid-term exam schedule" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder="Write the notice…"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {requireSections ? (
            <FormField
              control={form.control}
              name="sectionIds"
              render={() => (
                <FormItem>
                  <FormLabel>Sections</FormLabel>
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    {sections.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">
                        You have no assigned sections.
                      </p>
                    ) : (
                      <div className="divide-y">
                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-2">
                          <Checkbox
                            id="notice-sections-all"
                            checked={allSelected}
                            onCheckedChange={(checked) =>
                              form.setValue(
                                "sectionIds",
                                checked ? sections.map((s) => s.id) : [],
                                { shouldValidate: true },
                              )
                            }
                          />
                          <Label
                            htmlFor="notice-sections-all"
                            className="text-sm font-medium"
                          >
                            Select all
                          </Label>
                        </div>
                        {sections.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-2 px-3 py-2"
                          >
                            <Checkbox
                              id={`notice-section-${s.id}`}
                              checked={selected.includes(s.id)}
                              onCheckedChange={(checked) =>
                                form.setValue(
                                  "sectionIds",
                                  checked
                                    ? [...selected, s.id]
                                    : selected.filter((id) => id !== s.id),
                                  { shouldValidate: true },
                                )
                              }
                            />
                            <Label
                              htmlFor={`notice-section-${s.id}`}
                              className="text-sm font-normal"
                            >
                              {s.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <Button type="submit" className="w-full" disabled={isExecuting}>
            {isExecuting && <Loader2 className="size-4 animate-spin" />}
            Publish notice
          </Button>
        </form>
      </Form>
    </FormDialog>
  );
}

function DeactivateNoticeButton({
  notice,
  action,
}: {
  notice: NoticeItem;
  action: typeof adminDeactivateNotice;
}) {
  const { executeAsync } = useAction(action, {
    onSuccess: () => toast.success("Notice deactivated"),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not deactivate notice"),
  });

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" className="size-8">
          <X className="size-4" />
          <span className="sr-only">Deactivate</span>
        </Button>
      }
      title="Deactivate notice?"
      description={`"${notice.title}" will no longer be visible to its audience.`}
      confirmLabel="Deactivate"
      destructive
      onConfirm={async () => {
        await executeAsync({ id: notice.id });
      }}
    />
  );
}

export function NoticesFeed({
  notices,
  deactivateAction,
}: {
  notices: NoticeItem[];
  deactivateAction?: typeof adminDeactivateNotice;
}) {
  if (notices.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="No notices yet"
        description="Notices for your audience will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {notices.map((n) => (
        <Card key={n.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={TYPE_VARIANTS[n.type]}>
                    {TYPE_LABELS[n.type]}
                  </Badge>
                  {n.type === "SECTION"
                    ? n.targetSections.map((name) => (
                        <Badge key={name} variant="outline">
                          {name}
                        </Badge>
                      ))
                    : null}
                </div>
                <CardTitle className="text-base font-medium">
                  {n.title}
                </CardTitle>
              </div>
              {deactivateAction ? (
                <DeactivateNoticeButton notice={n} action={deactivateAction} />
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{n.body}</p>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              by {n.createdByName} · {formatDate(n.createdAt)}
            </p>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
