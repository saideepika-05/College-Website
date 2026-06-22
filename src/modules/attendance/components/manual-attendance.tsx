"use client";

import { ClipboardList, Clock, Loader2, Users } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/kit/form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YEAR_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { teacherManualAttendance } from "@/modules/attendance/actions";
import type { ClassOption } from "@/modules/attendance/components/start-session";
import { getCurrentPeriod } from "@/modules/attendance/periods";
import type { RosterStudent } from "@/modules/attendance/queries";

type Status = "PRESENT" | "ABSENT";

/**
 * "Mark manually" launcher: pick a class, then mark the full roster
 * Present/Absent for the current period. Saves as a finalized session.
 */
export function ManualAttendanceButton({
  classes,
  rosters,
  action,
  detailHrefBase,
}: {
  classes: ClassOption[];
  rosters: Record<string, RosterStudent[]>;
  action: typeof teacherManualAttendance;
  /** e.g. "/teacher/attendance" — the new session id is appended. */
  detailHrefBase: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [classKey, setClassKey] = useState("");
  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  // Strict-auto period, same as the QR flow.
  const [period, setPeriod] = useState(() => getCurrentPeriod());
  useEffect(() => {
    if (!open) return;
    const update = () => setPeriod(getCurrentPeriod());
    const first = setTimeout(update, 0);
    const interval = setInterval(update, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [open]);

  const selected = useMemo(
    () => classes.find((c) => `${c.subjectId}|${c.sectionId}` === classKey),
    [classes, classKey],
  );
  const roster = useMemo(
    () => (selected ? (rosters[selected.sectionId] ?? []) : []),
    [selected, rosters],
  );

  // Selecting a class defaults the whole roster to PRESENT.
  const handleClassChange = (key: string) => {
    setClassKey(key);
    const sel = classes.find((c) => `${c.subjectId}|${c.sectionId}` === key);
    const r = sel ? (rosters[sel.sectionId] ?? []) : [];
    setStatuses(Object.fromEntries(r.map((s) => [s.studentId, "PRESENT"])));
  };

  const setAll = (status: Status) =>
    setStatuses(Object.fromEntries(roster.map((s) => [s.studentId, status])));

  const presentCount = useMemo(
    () => roster.filter((s) => (statuses[s.studentId] ?? "PRESENT") === "PRESENT").length,
    [roster, statuses],
  );

  const { execute, isExecuting } = useAction(action, {
    onSuccess: ({ data }) => {
      setOpen(false);
      toast.success("Attendance saved");
      if (data?.sessionId) router.push(`${detailHrefBase}/${data.sessionId}`);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not save attendance"),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      wide
      trigger={
        <Button variant="outline">
          <ClipboardList className="size-4" /> Mark manually
        </Button>
      }
      title="Mark attendance manually"
      description="Record attendance for the current period without a QR scan."
    >
      <div className="space-y-4">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
            period
              ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
              : "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400",
          )}
        >
          <Clock className="size-4 shrink-0" />
          {period ? (
            <span>
              Current period: <strong>P{period.no}</strong> · {period.label}
            </span>
          ) : (
            <span>
              No active period right now. Attendance opens during scheduled
              hours (9:40–4:10).
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label>Class</Label>
          <Select value={classKey} onValueChange={handleClassChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select subject · section" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem
                  key={`${c.subjectId}|${c.sectionId}`}
                  value={`${c.subjectId}|${c.sectionId}`}
                >
                  {c.subjectCode} — {c.subjectName} · {c.sectionName} (
                  {YEAR_LABELS[c.yearLevel]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected &&
          (roster.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No students enrolled in this section.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Users className="size-4" /> {presentCount}/{roster.length}{" "}
                  present
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setAll("PRESENT")}
                  >
                    All present
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setAll("ABSENT")}
                  >
                    All absent
                  </Button>
                </div>
              </div>
              <ul className="divide-y rounded-md border">
                {roster.map((s) => {
                  const st = statuses[s.studentId] ?? "PRESENT";
                  return (
                    <li
                      key={s.studentId}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {s.rollNumber}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={st === "PRESENT" ? "default" : "outline"}
                          className={cn(
                            "h-7 px-2 text-xs",
                            st === "PRESENT" &&
                              "bg-emerald-600 hover:bg-emerald-600 text-white",
                          )}
                          onClick={() =>
                            setStatuses((m) => ({ ...m, [s.studentId]: "PRESENT" }))
                          }
                        >
                          Present
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={st === "ABSENT" ? "destructive" : "outline"}
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            setStatuses((m) => ({ ...m, [s.studentId]: "ABSENT" }))
                          }
                        >
                          Absent
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

        <Button
          className="w-full"
          disabled={!selected || !period || roster.length === 0 || isExecuting}
          onClick={() =>
            selected &&
            execute({
              sectionId: selected.sectionId,
              subjectId: selected.subjectId,
              records: roster.map((s) => ({
                studentId: s.studentId,
                status: statuses[s.studentId] ?? "ABSENT",
              })),
            })
          }
        >
          {isExecuting && <Loader2 className="size-4 animate-spin" />}
          Save attendance
        </Button>
      </div>
    </FormDialog>
  );
}
