import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function Loading({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-36 items-center justify-center gap-2 text-sm text-muted-foreground",
        className,
      )}
      role="status"
    >
      <LoaderCircle className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
