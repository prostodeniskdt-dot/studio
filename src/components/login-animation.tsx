import { cn } from "@/lib/utils";

export function LoginAnimation({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-xs p-8", className)}>
      <svg viewBox="0 0 100 80" className="w-full h-auto">
        {/* Guide lines */}
        <line x1="0" y1="0" x2="100" y2="0" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
        <line x1="0" y1="20" x2="100" y2="20" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
        <line x1="0" y1="40" x2="100" y2="40" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
        <line x1="0" y1="60" x2="100" y2="60" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />

        {/* Ground line */}
        <line x1="0" y1="80" x2="100" y2="80" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
        
        {/* Bars */}
        <rect className="bar bar-1" x="0"  y="80" width="18" height="0" />
        <rect className="bar bar-2" x="20" y="80" width="18" height="0" />
        <rect className="bar bar-3" x="40" y="80" width="18" height="0" />
        <rect className="bar bar-4" x="60" y="80" width="18" height="0" />
        <rect className="bar bar-5" x="80" y="80" width="18" height="0" />

        {/* Animated Numbers */}
        <text className="bar-text bar-text-1" x="9" y="80">25k</text>
        <text className="bar-text bar-text-2" x="29" y="80">42k</text>
        <text className="bar-text bar-text-3" x="49" y="80">18k</text>
        <text className="bar-text bar-text-4" x="69" y="80">35k</text>
        <text className="bar-text bar-text-5" x="89" y="80">29k</text>
      </svg>
    </div>
  );
}
