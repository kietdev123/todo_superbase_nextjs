import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeVariant = "success" | "warning" | "danger" | "neutral";

const variantClasses: Record<StatusBadgeVariant, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300",
  danger:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({
  label,
  variant = "neutral",
  dot = true,
}: {
  label: string;
  variant?: StatusBadgeVariant;
  dot?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 py-1", variantClasses[variant])}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {label}
    </Badge>
  );
}
