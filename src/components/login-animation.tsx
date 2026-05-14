'use client';
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const TARGETS = [62, 87, 50, 75, 68];
const CYCLE_DURATION = 4000;
const STAGGER = 200;
const GROW_DURATION = 800; // Animation growth phase

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function LoginAnimation({ className }: { className?: string }) {
  const textRefs = useRef<(SVGTextElement | null)[]>([]);

  useEffect(() => {
    let animationFrameId: number;
    const reducedMotionMatcher = window.matchMedia('(prefers-reduced-motion: reduce)');

    const animate = (time: number) => {
      if (reducedMotionMatcher.matches) {
        textRefs.current.forEach((textEl, i) => {
          if (textEl) {
            textEl.textContent = `${TARGETS[i]}%`;
            textEl.style.opacity = '1';
          }
        });
        return;
      }

      textRefs.current.forEach((textEl, i) => {
        if (!textEl) return;

        const localTime = (time - i * STAGGER) % CYCLE_DURATION;
        const progress = Math.min(localTime / GROW_DURATION, 1);

        if (localTime < GROW_DURATION) {
          // Growing phase
          const easedProgress = easeOutCubic(progress);
          const currentValue = Math.round(TARGETS[i] * easedProgress);
          textEl.textContent = `${currentValue}%`;
          textEl.style.opacity = String(easedProgress);
        } else if (localTime >= GROW_DURATION && localTime < (CYCLE_DURATION * 0.75)) {
          // Hold phase
          textEl.textContent = `${TARGETS[i]}%`;
          textEl.style.opacity = '1';
        } else {
           // Fade out phase
          textEl.textContent = `${TARGETS[i]}%`;
          const fadeProgress = (localTime - (CYCLE_DURATION * 0.75)) / (CYCLE_DURATION * 0.25);
          textEl.style.opacity = String(1 - fadeProgress);
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleReducedMotionChange = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Initial call
    animationFrameId = requestAnimationFrame(animate);

    reducedMotionMatcher.addEventListener('change', handleReducedMotionChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      reducedMotionMatcher.removeEventListener('change', handleReducedMotionChange);
    };
  }, []);

  return (
    <div className={cn("w-full max-w-xs p-8", className)}>
      <svg viewBox="0 0 100 92" className="w-full h-auto">
        {/* Guide lines */}
        <line x1="0" y1="0" x2="100" y2="0" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
        <line x1="0" y1="20" x2="100" y2="20" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
        <line x1="0" y1="40" x2="100" y2="40" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
        <line x1="0" y1="60" x2="100" y2="60" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />

        {/* Ground line */}
        <line x1="0" y1="80" x2="100" y2="80" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
        
        {/* Bars */}
        <rect className="bar bar-1" x="0"  y="0" width="18" height="80" style={{ '--v': 0.62 } as React.CSSProperties} />
        <rect className="bar bar-2" x="20" y="0" width="18" height="80" style={{ '--v': 0.87 } as React.CSSProperties} />
        <rect className="bar bar-3" x="40" y="0" width="18" height="80" style={{ '--v': 0.50 } as React.CSSProperties} />
        <rect className="bar bar-4" x="60" y="0" width="18" height="80" style={{ '--v': 0.75 } as React.CSSProperties} />
        <rect className="bar bar-5" x="80" y="0" width="18" height="80" style={{ '--v': 0.68 } as React.CSSProperties} />

        {/* Animated Numbers */}
        <text className="bar-text" x="9" y="90" ref={el => { textRefs.current[0] = el; }}>0%</text>
        <text className="bar-text" x="29" y="90" ref={el => { textRefs.current[1] = el; }}>0%</text>
        <text className="bar-text" x="49" y="90" ref={el => { textRefs.current[2] = el; }}>0%</text>
        <text className="bar-text" x="69" y="90" ref={el => { textRefs.current[3] = el; }}>0%</text>
        <text className="bar-text" x="89" y="90" ref={el => { textRefs.current[4] = el; }}>0%</text>
      </svg>
    </div>
  );
}
