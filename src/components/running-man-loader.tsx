'use client';

import * as React from 'react';
import { PersonStanding } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RunningManLoader() {
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
        // This is a fake progress for visual effect.
        // The total animation duration is controlled by CSS (2s).
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) return 100;
                // Simulate a slightly more realistic loading pattern
                const increment = Math.random() * 10;
                return Math.min(prev + increment, 100);
            });
        }, 150);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">Подключаемся...</h2>
            <div className="w-full relative h-10 flex items-center">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-fill-progress rounded-full"></div>
                </div>
                 <div className="absolute top-0 left-0 w-full h-full animate-run-track">
                    <PersonStanding className="w-6 h-6 text-primary -mt-1 animate-bob-and-run" />
                </div>
            </div>
            <p className="text-lg font-bold text-primary tabular-nums">
                {Math.round(progress)}%
            </p>
        </div>
    );
}
