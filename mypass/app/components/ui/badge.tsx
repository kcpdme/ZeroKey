// app/components/ui/badge.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20",
                secondary:
                    "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
                outline: "text-[var(--text-primary)] border-[var(--border-color)]",
                destructive:
                    "border-red-500/30 bg-red-500/10 text-red-400",
                cyan: "border-cyan-500/40 bg-cyan-500/15 text-cyan-400",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
