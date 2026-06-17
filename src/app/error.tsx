"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
        <AlertTriangle className="size-7 text-red-600 dark:text-red-400" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Try again — if it persists, contact
          the administrator.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">
            Ref: {error.digest}
          </p>
        ) : null}
      </div>
      <Button onClick={reset}>
        <RotateCcw className="size-4" /> Try again
      </Button>
    </main>
  );
}
