"use client";

import { CalendarDays, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/kit/empty-state";
import { FormDialog } from "@/components/kit/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DAY_LABELS,
  type DayOfWeek,
  YEAR_LABELS,
  type YearLevel,
} from "@/lib/labels";
import type {
  adminAddTimetableEntry,
  adminRemoveTimetableEntry,
} from "@/modules/teaching/actions";
import type {
  listTeacherAssignments,
  TimetableCell,
} from "@/modules/teaching/queries";
import { TimetableGrid } from "./timetable-grid";

type AssignmentRow = Awaited<
  ReturnType<typeof listTeacherAssignments>
>[number];

export type SectionOption = {
  id: string;
  name: string;
  yearLevel: YearLevel;
  departmentName: string;
};

/** Period N defaults: starts at 09:00 + (N-1) hours, 1-hour duration. */
function periodDefaults(periodNo: number) {
  const startHour = 9 + (periodNo - 1);
  const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return { startTime: pad(startHour), endTime: pad(startHour + 1) };
}

export function TimetableEditor({
  sections,
  selectedSectionId,
  cells,
  assignments,
  addAction,
  removeAction,
}: {
  sections: SectionOption[];
  selectedSectionId?: string;
  cells: TimetableCell[];
  assignments: AssignmentRow[];
  addAction: typeof adminAddTimetableEntry;
  removeAction: typeof adminRemoveTimetableEntry;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<{
    day: DayOfWeek;
    periodNo: number;
  } | null>(null);
  const [combo, setCombo] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const sectionAssignments = assignments.filter(
    (a) => a.sectionId === selectedSectionId,
  );

  const { execute: executeAdd, isExecuting: isAdding } = useAction(addAction, {
    onSuccess: () => {
      toast.success("Period added");
      setPending(null);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not add period"),
  });

  const { executeAsync: executeRemove } = useAction(removeAction, {
    onSuccess: () => toast.success("Period removed"),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not remove period"),
  });

  const handleAdd = (day: DayOfWeek, periodNo: number) => {
    const defaults = periodDefaults(periodNo);
    setCombo("");
    setStartTime(defaults.startTime);
    setEndTime(defaults.endTime);
    setPending({ day, periodNo });
  };

  const handleSubmit = () => {
    if (!pending || !selectedSectionId) return;
    const [subjectId, teacherId] = combo.split("|");
    if (!subjectId || !teacherId) return;
    executeAdd({
      sectionId: selectedSectionId,
      subjectId,
      teacherId,
      dayOfWeek: pending.day,
      periodNo: pending.periodNo,
      startTime,
      endTime,
    });
  };

  return (
    <div className="space-y-4">
      <Select
        value={selectedSectionId ?? ""}
        onValueChange={(v) => router.push(`?sectionId=${v}`)}
      >
        <SelectTrigger className="w-full max-w-sm">
          <SelectValue placeholder="Select a section" />
        </SelectTrigger>
        <SelectContent>
          {sections.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} · {YEAR_LABELS[s.yearLevel]} · {s.departmentName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedSectionId ? (
        <>
          <TimetableGrid
            cells={cells}
            mode="section"
            onAdd={handleAdd}
            onRemove={async (id) => {
              await executeRemove({ id });
            }}
          />
          <FormDialog
            open={pending !== null}
            onOpenChange={(o) => {
              if (!o) setPending(null);
            }}
            title="Add period"
            description={
              pending
                ? `${DAY_LABELS[pending.day]} · Period ${pending.periodNo}`
                : undefined
            }
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject · Teacher</Label>
                <Select value={combo} onValueChange={setCombo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subject and teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionAssignments.length ? (
                      sectionAssignments.map((a) => (
                        <SelectItem
                          key={a.id}
                          value={`${a.subjectId}|${a.teacherId}`}
                        >
                          {a.subjectCode} — {a.subjectName} · {a.teacherName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none" disabled>
                        No teacher assignments for this section
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="timetable-start-time">Start time</Label>
                  <Input
                    id="timetable-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timetable-end-time">End time</Label>
                  <Input
                    id="timetable-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={!combo || isAdding}
                onClick={handleSubmit}
              >
                {isAdding && <Loader2 className="size-4 animate-spin" />}
                Add period
              </Button>
            </div>
          </FormDialog>
        </>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Pick a section to edit its timetable"
          description="Choose a section above to view and build its weekly schedule."
        />
      )}
    </div>
  );
}
