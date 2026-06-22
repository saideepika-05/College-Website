"use client";

import { Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { teacherCloseAttendanceSession } from "@/modules/attendance/actions";
import { QR_WINDOW_SECONDS } from "@/modules/attendance/token-constants";

type LiveData = {
  status: "OPEN" | "CLOSED";
  isOpen: boolean;
  sessionExpiresAt: string;
  qr: { payload: string; expiresInSeconds: number } | null;
  present: { rollNumber: string; name: string; markedAt: string }[];
  presentCount: number;
};

/**
 * The projector screen: a large rotating QR with a countdown ring and a
 * live roster of students as they scan. Polls the live endpoint; the QR
 * payload itself rotates server-side every QR_WINDOW_SECONDS.
 */
export function LiveSession({
  sessionId,
  title,
  subtitle,
  enrolledCount,
  closeAction,
}: {
  sessionId: string;
  title: string;
  subtitle: string;
  enrolledCount: number;
  closeAction: typeof teacherCloseAttendanceSession;
}) {
  const router = useRouter();
  const [data, setData] = useState<LiveData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_WINDOW_SECONDS);
  const dataRef = useRef<LiveData | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}/live`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const next = (await res.json()) as LiveData;
      dataRef.current = next;
      setData(next);
      if (next.qr) setSecondsLeft(next.qr.expiresInSeconds);
      // Already finalized elsewhere → swap to the closed view. An expired-but-
      // still-OPEN session is auto-closed by the effect below instead.
      if (!next.isOpen && next.status === "CLOSED") router.refresh();
    } catch {
      // transient network failure — next poll retries
    }
  }, [sessionId, router]);

  useEffect(() => {
    const initial = setTimeout(refresh, 0);
    const poll = setInterval(refresh, 3000);
    return () => {
      clearTimeout(initial);
      clearInterval(poll);
    };
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          void refresh();
          return QR_WINDOW_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [refresh]);

  const { executeAsync: closeSession, isExecuting: closing } = useAction(
    closeAction,
    {
      onSuccess: () => {
        toast.success("Session closed — absentees recorded");
        router.refresh();
      },
      onError: ({ error }) =>
        toast.error(error.serverError ?? "Could not close the session"),
    },
  );

  // When the 30s window lapses but the session is still OPEN in the DB,
  // finalize it immediately (backfill absentees) so student-side attendance
  // updates without waiting for the cron. Fires once.
  const autoClosedRef = useRef(false);
  useEffect(() => {
    if (
      data &&
      data.status === "OPEN" &&
      !data.isOpen &&
      !autoClosedRef.current
    ) {
      autoClosedRef.current = true;
      void closeSession({ sessionId });
    }
  }, [data, closeSession, sessionId]);

  const progress = secondsLeft / QR_WINDOW_SECONDS;
  const ringRadius = 46;
  const circumference = 2 * Math.PI * ringRadius;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-6 p-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>

          {data?.qr ? (
            <div className="relative">
              <div className="rounded-2xl border-8 border-foreground/90 bg-white p-6 shadow-lg">
                <QRCode
                  value={data.qr.payload}
                  size={320}
                  className="h-auto w-full max-w-[320px]"
                />
              </div>
              <div className="absolute -right-4 -top-4">
                <div className="relative flex size-14 items-center justify-center rounded-full bg-background shadow-md">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r={ringRadius}
                      fill="none"
                      strokeWidth="8"
                      className="stroke-muted"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={ringRadius}
                      fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - progress)}
                    />
                  </svg>
                  <span className="text-sm font-semibold tabular-nums">
                    {secondsLeft}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-80 w-80 items-center justify-center rounded-2xl border border-dashed">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Scan with the student portal · the code refreshes every{" "}
            {QR_WINDOW_SECONDS} seconds
          </p>

          <ConfirmDialog
            trigger={
              <Button size="lg" variant="destructive" disabled={closing}>
                {closing && <Loader2 className="size-4 animate-spin" />}
                End session
              </Button>
            }
            title="End this attendance session?"
            description="Students who haven't scanned will be marked absent. You can still edit records afterwards."
            confirmLabel="End session"
            destructive
            onConfirm={async () => {
              await closeSession({ sessionId });
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Scanned</span>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {data?.presentCount ?? 0} / {enrolledCount}
            </Badge>
          </div>
          <ScrollArea className="h-[420px]">
            <ul className="space-y-1 pr-3">
              {data?.present.length ? (
                [...data.present].reverse().map((p) => (
                  <li
                    key={p.rollNumber}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.rollNumber}
                    </span>
                  </li>
                ))
              ) : (
                <li className="py-10 text-center text-sm text-muted-foreground">
                  Waiting for the first scan…
                </li>
              )}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
