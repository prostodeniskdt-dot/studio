import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'success' | 'destructive' | 'warning'
  description?: string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  description,
  className,
  ...props
}: MetricCardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-success/50 bg-success/5',
    destructive: 'border-destructive/50 bg-destructive/5',
    warning: 'border-warning/50 bg-warning/5',
  }

  const trendIcon = trend ? (
    trend.value > 0 ? (
      <TrendingUp className="h-4 w-4 text-success" />
    ) : trend.value < 0 ? (
      <TrendingDown className="h-4 w-4 text-destructive" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground" />
    )
  ) : null

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className="rounded-full bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {trendIcon}
            <span className={cn(
              trend.value > 0 && "text-success",
              trend.value < 0 && "text-destructive"
            )}>
              {trend.label}
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

