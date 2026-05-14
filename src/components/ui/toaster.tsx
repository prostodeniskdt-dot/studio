"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  const iconMap = {
    default: Info,
    destructive: AlertCircle,
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = variant ? iconMap[variant] : iconMap.default
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 w-full">
              <div className={cn(
                "flex-shrink-0 rounded-full p-1.5",
                variant === "destructive" && "bg-destructive/20",
                variant === "success" && "bg-success/20",
                variant === "warning" && "bg-warning/20",
                variant === "info" && "bg-primary/20",
                !variant && "bg-muted"
              )}>
                <Icon className={cn(
                  "h-4 w-4",
                  variant === "destructive" && "text-destructive",
                  variant === "success" && "text-success",
                  variant === "warning" && "text-warning",
                  variant === "info" && "text-primary",
                  !variant && "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 space-y-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
