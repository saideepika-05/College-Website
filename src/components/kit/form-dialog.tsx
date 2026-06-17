"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Standard create/edit dialog wrapper. Controlled when `open`/`onOpenChange`
 * are passed; otherwise uncontrolled via `trigger`.
 */
export function FormDialog({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  children,
  wide = false,
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={wide ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <ScrollArea className="max-h-[70dvh]">
          <div className="px-1 py-1">{children}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
