import * as React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "danger" | "muted" | "accent" | "outline";
}) {
  const styles = {
    default: "bg-foreground/[0.06] text-foreground border border-border",
    accent: "bg-accent/10 text-accent border border-accent/20",
    success: "bg-success/10 text-success border border-success/20",
    warning: "bg-warning/10 text-warning border border-warning/20",
    danger: "bg-danger/10 text-danger border border-danger/20",
    muted: "bg-muted text-muted-foreground border border-border",
    outline: "bg-transparent text-foreground border border-border",
  }[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const map: Record<string, { variant: "default" | "success" | "warning" | "danger" | "accent" | "muted"; dot: string }> = {
    DRAFT: { variant: "muted", dot: "bg-muted-foreground" },
    AWAITING_APPROVAL: { variant: "warning", dot: "bg-warning" },
    SCOPE_APPROVED: { variant: "accent", dot: "bg-accent" },
    AWAITING_PAYMENT: { variant: "accent", dot: "bg-accent" },
    PAID: { variant: "success", dot: "bg-success" },
    IN_PROGRESS: { variant: "accent", dot: "bg-accent" },
    IN_REVIEW: { variant: "warning", dot: "bg-warning" },
    REVISION_REQUESTED: { variant: "warning", dot: "bg-warning" },
    COMPLETED: { variant: "success", dot: "bg-success" },
    CANCELLED: { variant: "muted", dot: "bg-muted-foreground" },
    DISPUTED: { variant: "danger", dot: "bg-danger" },
  };
  const cfg = map[status] ?? { variant: "default", dot: "bg-muted-foreground" };
  return (
    <Badge variant={cfg.variant} className={className}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}
