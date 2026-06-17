"use client";

import { Clock, Loader2, QrCode } from "lucide-react";
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
import type { teacherOpenAttendanceSession } from "@/modules/attendance/actions";
import { getCurrentPeriod } from "@/modules/attendance/periods";

export type ClassOption = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sectionId: string;
  sectionName: string;
  yearLevel: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4";
};

/**
 * "Take attendance" launcher: pick the class (one of the caller's
 * subject·section pairs) and a duration, then jump to the live QR screen.
 */
export function StartSessionButton({
  classes,
  action,
  detailHrefBase,
}: {
  classes: ClassOption[];
  action: typeof teacherOpenAttendanceSession;
  /** e.g. "/teacher/attendance" — the new session id is appended. */
  detailHrefBase: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [classKey, setClassKey] = useState("");
  const [duration, setDuration] = useState("10");

  // Strict-auto period: locked to the clock. Re-evaluate while the dialog is
  // open so the displayed period stays correct across a slot boundary.
  const [period, setPeriod] = useState(() => getCurrentPeriod());
  useEffect(() => {
    if (!open) return;
    const update = () => setPeriod(getCurrentPeriod());
    // Refresh on open (deferred so it isn't a synchronous effect setState)
    // and keep it current across a slot boundary while the dialog stays open.
    const first = setTimeout(update, 0);
    const interval = setInterval(update, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [open]);

  const { execute, isExecuting } = useAction(action, {
    onSuccess: ({ data }) => {
      setOpen(false);
      if (data?.sessionId) {
        router.push(`${detailHrefBase}/${data.sessionId}`);
      }
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not start the session"),
  });

  const selected = useMemo(
    () => classes.find((c) => `${c.subjectId}|${c.sectionId}` === classKey),
    [classes, classKey],
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <QrCode className="size-4" /> Take attendance
        </Button>
      }
      title="Start attendance session"
      description="A rotating QR code opens for the selected class."
    >
      <div className="space-y-4">
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            period
              ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
              : "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400"
          }`}
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
          <Select value={classKey} onValueChange={setClassKey}>
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
        <div className="space-y-2">
          <Label>Scanning window</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full"
          disabled={!selected || !period || isExecuting}
          onClick={() =>
            selected &&
            execute({
              subjectId: selected.subjectId,
              sectionId: selected.sectionId,
              durationMinutes: Number(duration),
            })
          }
        >
          {isExecuting && <Loader2 className="size-4 animate-spin" />}
          Generate QR
        </Button>
      </div>
    </FormDialog>
  );
}
