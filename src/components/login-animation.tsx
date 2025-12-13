import { cn } from "@/lib/utils";

export function LoginAnimation({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-xs p-8", className)}>
      <svg viewBox="0 0 100 80" className="w-full h-auto">
        {/* Ground line */}
        <line x1="0" y1="80" x2="100" y2="80" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
        
        {/* Bars */}
        <rect className="bar bar-1" x="0"  y="80" width="18" height="0" />
        <rect className="bar bar-2" x="20" y="80" width="18" height="0" />
        <rect className="bar bar-3" x="40" y="80" width="18" height="0" />
        <rect className="bar bar-4" x="60" y="80" width="18" height="0" />
        <rect className="bar bar-5" x="80" y="80" width="18" height="0" />
      </svg>
    </div>
  );
}
