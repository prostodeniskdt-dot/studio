import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-8 text-primary"
      >
        <path d="M14 10a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V10Z" />
        <path d="M6 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        <path d="M18 10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" />
        <path d="M22 10h-2" />
        <path d="M2 10h2" />
        <path d="m14 4 1-1" />
        <path d="m6 4-1-1" />
      </svg>
      <span className="text-2xl font-bold text-primary">BarBoss</span>
    </div>
  );
}
