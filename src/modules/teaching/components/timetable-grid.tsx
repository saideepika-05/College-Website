"use client";

import { Plus, X } from "lucide-react";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DAY_LABELS,
  DAYS_OF_WEEK,
  type DayOfWeek,
  formatTime12h,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TimetableCell } from "@/modules/teaching/queries";

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function TimetableGrid({
  cells,
  mode,
  highlightDay,
  onAdd,
  onRemove,
}: {
  cells: TimetableCell[];
  mode: "section" | "teacher";
  highlightDay?: DayOfWeek;
  onAdd?: (day: DayOfWeek, periodNo: number) => void;
  onRemove?: (id: string) => void | Promise<void>;
}) {
  const bySlot = new Map<string, TimetableCell>();
  for (const cell of cells) {
    bySlot.set(`${cell.dayOfWeek}-${cell.periodNo}`, cell);
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Day</TableHead>
            {PERIODS.map((p) => (
              <TableHead key={p} className="text-center">
                Period {p}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {DAYS_OF_WEEK.map((day) => (
            <TableRow
              key={day}
              className={cn(day === highlightDay && "bg-primary/5")}
            >
              <TableCell className="font-medium">{DAY_LABELS[day]}</TableCell>
              {PERIODS.map((periodNo) => {
                const cell = bySlot.get(`${day}-${periodNo}`);
                return (
                  <TableCell key={periodNo} className="p-1.5 align-top">
                    {cell ? (
                      <EntryCard cell={cell} mode={mode} onRemove={onRemove} />
                    ) : onAdd ? (
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 opacity-40 hover:opacity-100"
                          aria-label={`Add ${DAY_LABELS[day]} period ${periodNo}`}
                          onClick={() => onAdd(day, periodNo)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-8 rounded-md bg-muted/30" />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EntryCard({
  cell,
  mode,
  onRemove,
}: {
  cell: TimetableCell;
  mode: "section" | "teacher";
  onRemove?: (id: string) => void | Promise<void>;
}) {
  return (
    <div className="min-w-28 rounded-md border bg-card p-2 text-left shadow-xs">
      <div className="flex items-start justify-between gap-1">
        {mode === "teacher" ? (
          <p className="truncate text-xs font-medium">{cell.sectionName}</p>
        ) : (
          <p className="font-mono text-xs font-medium">{cell.subjectCode}</p>
        )}
        {onRemove ? (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Remove period"
              >
                <X className="size-3" />
              </Button>
            }
            title="Remove this period?"
            description={`${cell.subjectCode} on ${DAY_LABELS[cell.dayOfWeek]}, period ${cell.periodNo} will be removed from the timetable.`}
            confirmLabel="Remove"
            destructive
            onConfirm={() => onRemove(cell.id)}
          />
        ) : null}
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {mode === "teacher" ? (
          <span className="font-mono">{cell.subjectCode}</span>
        ) : (
          <>
            {cell.subjectName} · {cell.teacherName}
          </>
        )}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {formatTime12h(cell.startTime)} – {formatTime12h(cell.endTime)}
      </p>
    </div>
  );
}
