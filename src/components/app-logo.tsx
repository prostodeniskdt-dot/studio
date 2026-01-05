import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className={cn("text-2xl font-bold", className?.includes('text-sidebar') ? 'text-inherit' : 'text-primary')}>
        BAR BOSS ONLINE
      </span>
    </div>
  );
}
