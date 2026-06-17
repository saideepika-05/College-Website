"use client";

import { ArrowRight, GraduationCap, Loader2, TrendingUp } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { EmptyState } from "@/components/kit/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YEAR_LABELS, YEAR_LEVELS } from "@/lib/labels";
import type {
  adminGraduateStudents,
  adminPromoteStudents,
} from "@/modules/promotion/actions";

export type SectionOption = {
  id: string;
  name: string;
  yearLevel: (typeof YEAR_LEVELS)[number];
  departmentId: string;
  departmentName: string;
  academicSessionId: string;
  sessionLabel: string;
  sessionIsActive: boolean;
  isActive: boolean;
};

export type RosterRow = {
  studentId: string;
  rollNumber: string;
  name: string;
};

function sectionLabel(s: SectionOption) {
  return `${s.name} · ${YEAR_LABELS[s.yearLevel]} · ${s.departmentName} (${s.sessionLabel})`;
}

/**
 * Bulk promotion with a dry-run preview: pick source section (roster is
 * fetched server-side via the ?from= search param), pick destination,
 * tick students, confirm. 4th-year sections switch to graduation mode.
 */
export function PromotionView({
  sections,
  roster,
  fromSectionId,
  promoteAction,
  graduateAction,
}: {
  sections: SectionOption[];
  roster: RosterRow[];
  fromSectionId: string | null;
  promoteAction: typeof adminPromoteStudents;
  graduateAction: typeof adminGraduateStudents;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toSectionId, setToSectionId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(roster.map((r) => r.studentId)),
  );

  const from = sections.find((s) => s.id === fromSectionId) ?? null;
  const isFinalYear = from?.yearLevel === "YEAR_4";

  const destinations = useMemo(() => {
    if (!from) return [];
    const nextYear =
      YEAR_LEVELS[YEAR_LEVELS.indexOf(from.yearLevel) + 1] ?? null;
    if (!nextYear) return [];
    return sections.filter(
      (s) =>
        s.isActive &&
        s.departmentId === from.departmentId &&
        s.yearLevel === nextYear &&
        s.academicSessionId !== from.academicSessionId,
    );
  }, [sections, from]);

  const { execute: promote, isExecuting: promoting } = useAction(
    promoteAction,
    {
      onSuccess: ({ data }) => {
        if (!data) return;
        toast.success(`Promoted ${data.promoted} student(s)`);
        if (data.skipped.length) {
          toast.warning(
            `Skipped ${data.skipped.length}: ${data.skipped
              .slice(0, 3)
              .map((s) => `${s.rollNumber} (${s.reason})`)
              .join("; ")}${data.skipped.length > 3 ? "…" : ""}`,
          );
        }
        router.refresh();
      },
      onError: ({ error }) =>
        toast.error(error.serverError ?? "Promotion failed"),
    },
  );

  const { execute: graduate, isExecuting: graduating } = useAction(
    graduateAction,
    {
      onSuccess: ({ data }) => {
        toast.success(`Marked ${data?.completed ?? 0} student(s) as completed`);
        router.refresh();
      },
      onError: ({ error }) =>
        toast.error(error.serverError ?? "Operation failed"),
    },
  );

  function selectSource(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", id);
    router.push(`?${params.toString()}`);
    setToSectionId("");
  }

  const allChecked = roster.length > 0 && selected.size === roster.length;
  const busy = promoting || graduating;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid items-end gap-4 pt-2 sm:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-2">
            <Label>Source section</Label>
            <Select value={fromSectionId ?? ""} onValueChange={selectSource}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Where students are now" />
              </SelectTrigger>
              <SelectContent>
                {sections
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {sectionLabel(s)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="hidden size-5 self-center text-muted-foreground sm:block" />
          <div className="space-y-2">
            <Label>
              {isFinalYear ? "Graduation" : "Destination section"}
            </Label>
            {isFinalYear ? (
              <p className="flex h-9 items-center text-sm text-muted-foreground">
                4th-year students are marked as completed.
              </p>
            ) : (
              <Select
                value={toSectionId}
                onValueChange={setToSectionId}
                disabled={!from}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      from ? "Next year's section" : "Pick a source first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {destinations.length ? (
                    destinations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {sectionLabel(s)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none" disabled>
                      No eligible destination sections
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {!from ? (
        <EmptyState
          icon={TrendingUp}
          title="Pick a source section"
          description="Choose where the students currently are to preview the promotion."
        />
      ) : roster.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No active students"
          description="This section has no actively enrolled students."
        />
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">
              {selected.size} of {roster.length} students selected
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="all"
                checked={allChecked}
                onCheckedChange={(c) =>
                  setSelected(
                    c ? new Set(roster.map((r) => r.studentId)) : new Set(),
                  )
                }
              />
              <Label htmlFor="all" className="text-sm font-normal">
                Select all
              </Label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 divide-y overflow-y-auto rounded-md border">
              {roster.map((r) => (
                <label
                  key={r.studentId}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selected.has(r.studentId)}
                    onCheckedChange={(c) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (c) next.add(r.studentId);
                        else next.delete(r.studentId);
                        return next;
                      });
                    }}
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.rollNumber}
                  </span>
                  <span className="font-medium">{r.name}</span>
                </label>
              ))}
            </div>

            <ConfirmDialog
              trigger={
                <Button
                  disabled={
                    busy ||
                    selected.size === 0 ||
                    (!isFinalYear && !toSectionId)
                  }
                  className="w-full sm:w-auto"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {isFinalYear ? (
                    <>
                      <GraduationCap className="size-4" /> Mark{" "}
                      {selected.size} as completed
                    </>
                  ) : (
                    <>
                      <TrendingUp className="size-4" /> Promote{" "}
                      {selected.size} student(s)
                    </>
                  )}
                </Button>
              }
              title={
                isFinalYear
                  ? `Mark ${selected.size} student(s) as completed?`
                  : `Promote ${selected.size} student(s)?`
              }
              description={
                isFinalYear
                  ? "Their current enrollment is marked COMPLETED. Historical records are preserved."
                  : "Each student gets a new enrollment in the destination section. Existing history is never overwritten."
              }
              confirmLabel={isFinalYear ? "Mark completed" : "Promote"}
              onConfirm={() => {
                const studentIds = [...selected];
                if (isFinalYear) {
                  graduate({ sectionId: from.id, studentIds });
                } else {
                  promote({
                    fromSectionId: from.id,
                    toSectionId,
                    studentIds,
                  });
                }
              }}
            />
            {!isFinalYear && toSectionId && (
              <p className="text-xs text-muted-foreground">
                Destination:{" "}
                <Badge variant="secondary">
                  {sectionLabel(sections.find((s) => s.id === toSectionId)!)}
                </Badge>
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
