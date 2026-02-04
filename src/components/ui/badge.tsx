import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
        success:
          "border-[var(--color-bullish)]/30 bg-[var(--color-bullish)]/15 text-[var(--color-bullish)]",
        warning:
          "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
        danger:
          "border-[var(--color-bearish)]/30 bg-[var(--color-bearish)]/15 text-[var(--color-bearish)]",
        outline:
          "text-[var(--color-text-secondary)] border-[var(--color-border)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
