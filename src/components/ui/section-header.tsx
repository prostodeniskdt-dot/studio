import * as React from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
  showSeparator?: boolean
}

export function SectionHeader({
  title,
  description,
  action,
  showSeparator = true,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {showSeparator && <Separator />}
    </div>
  )
}

