"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ScanState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "scanning" }
  | { phase: "submitting" }
  | { phase: "success" }
  | { phase: "error"; reason: string };

/**
 * Camera QR scanner. Decodes continuously; the first decoded frame is
 * POSTed to the scan endpoint and scanning stops until the user retries.
 * Requires HTTPS (or localhost) for camera access.
 */
export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const submittingRef = useRef(false);
  const [state, setState] = useState<ScanState>({ phase: "starting" });

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const submit = useCallback(
    async (payload: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      stop();
      setState({ phase: "submitting" });
      try {
        const res = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        });
        const data = (await res.json()) as { ok: boolean; reason?: string };
        if (data.ok) {
          if (navigator.vibrate) navigator.vibrate(150);
          setState({ phase: "success" });
        } else {
          setState({
            phase: "error",
            reason: data.reason ?? "Could not mark attendance.",
          });
        }
      } catch {
        setState({
          phase: "error",
          reason: "Network error — check your connection and retry.",
        });
      } finally {
        submittingRef.current = false;
      }
    },
    [stop],
  );

  const start = useCallback(async () => {
    try {
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 250,
      });
      const controls = await reader.decodeFromVideoDevice(
        undefined, // default (environment-facing where available) camera
        videoRef.current ?? undefined,
        (result) => {
          if (result) void submit(result.getText());
        },
      );
      controlsRef.current = controls;
      setState({ phase: "scanning" });
    } catch {
      setState({
        phase: "error",
        reason:
          "Camera unavailable. Allow camera access in your browser settings and retry.",
      });
    }
  }, [submit]);

  useEffect(() => {
    const t = setTimeout(() => void start(), 0);
    return () => {
      clearTimeout(t);
      stop();
    };
  }, [start, stop]);

  const showVideo = state.phase === "scanning" || state.phase === "starting";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative aspect-square w-full bg-black">
          {/* The video element must stay mounted for zxing to attach. */}
          <video
            ref={videoRef}
            className={`h-full w-full object-cover ${showVideo ? "" : "opacity-0"}`}
            muted
            playsInline
          />

          {state.phase === "scanning" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-56 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
          )}

          {state.phase === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <Camera className="size-8" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}

          {state.phase === "submitting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
              <Loader2 className="size-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Marking attendance…
              </p>
            </div>
          )}

          {state.phase === "success" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background">
              <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 animate-in zoom-in duration-300">
                <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">You&apos;re marked present</p>
                <p className="text-sm text-muted-foreground">
                  Attendance recorded against your account
                </p>
              </div>
            </div>
          )}

          {state.phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background p-6">
              <div className="flex size-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                {state.reason.startsWith("Camera") ? (
                  <CameraOff className="size-10 text-red-600 dark:text-red-400" />
                ) : (
                  <XCircle className="size-10 text-red-600 dark:text-red-400" />
                )}
              </div>
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                {state.reason}
              </p>
              <Button
                onClick={() => {
                  setState({ phase: "starting" });
                  void start();
                }}
              >
                <RotateCcw className="size-4" /> Try again
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
