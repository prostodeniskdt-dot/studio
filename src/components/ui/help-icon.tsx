'use client';

import * as React from 'react';
import { Lightbulb } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HelpIconProps {
  title?: string;
  description: string;
  className?: string;
}

export function HelpIcon({ title = 'Как пользоваться', description, className }: HelpIconProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-8 w-8 hover:bg-primary/10 transition-colors",
            className
          )}
        >
          <Lightbulb className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors animate-pulse" />
          <span className="sr-only">{title}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <h4 className="font-semibold mb-2">{title}</h4>
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {description}
        </p>
      </PopoverContent>
    </Popover>
  );
}

