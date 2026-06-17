"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setEntityActive } from "@/modules/academic/actions";

export function ActiveSwitch({
  id,
  entity,
  isActive,
}: {
  id: string;
  entity: "branch" | "department" | "section" | "subject";
  isActive: boolean;
}) {
  const { execute, isExecuting } = useAction(setEntityActive, {
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Could not update status"),
  });
  return (
    <Switch
      checked={isActive}
      disabled={isExecuting}
      onCheckedChange={(checked) => execute({ id, entity, isActive: checked })}
      aria-label="Toggle active"
    />
  );
}
