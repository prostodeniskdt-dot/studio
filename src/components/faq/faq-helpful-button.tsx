'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FAQHelpfulButtonProps {
  faqId: string;
}

export function FAQHelpfulButton({ faqId }: FAQHelpfulButtonProps) {
  const [isHelpful, setIsHelpful] = React.useState(false);
  const [helpfulCount, setHelpfulCount] = React.useState(0);
  const { toast } = useToast();

  // Загрузить состояние из localStorage при монтировании
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const helpfulData = localStorage.getItem(`faq_helpful_${faqId}`);
      if (helpfulData) {
        const parsed = JSON.parse(helpfulData);
        setIsHelpful(parsed.isHelpful || false);
        setHelpfulCount(parsed.count || 0);
      }
    } catch (error) {
      console.error('Error loading helpful data:', error);
    }
  }, [faqId]);

  const handleClick = () => {
    if (isHelpful) {
      // Убрать оценку
      setIsHelpful(false);
      setHelpfulCount(prev => Math.max(0, prev - 1));
      
      try {
        if (typeof window !== 'undefined') {
          const currentCount = Math.max(0, helpfulCount - 1);
          localStorage.setItem(
            `faq_helpful_${faqId}`,
            JSON.stringify({ isHelpful: false, count: currentCount })
          );
        }
      } catch (error) {
        console.error('Error saving helpful data:', error);
      }
    } else {
      // Добавить оценку
      setIsHelpful(true);
      setHelpfulCount(prev => prev + 1);
      
      try {
        if (typeof window !== 'undefined') {
          const newCount = helpfulCount + 1;
          localStorage.setItem(
            `faq_helpful_${faqId}`,
            JSON.stringify({ isHelpful: true, count: newCount })
          );
        }
      } catch (error) {
        console.error('Error saving helpful data:', error);
      }

      toast({
        title: 'Спасибо за отзыв!',
        description: 'Ваша оценка помогает улучшить FAQ раздел.',
        duration: 2000,
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`h-8 gap-2 text-xs transition-all ${
        isHelpful
          ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100/50 dark:bg-yellow-900/20'
          : 'text-muted-foreground hover:text-yellow-600 dark:hover:text-yellow-400'
      }`}
    >
      <ThumbsUp 
        className={`h-3.5 w-3.5 transition-transform ${
          isHelpful ? 'fill-current scale-110' : ''
        }`}
      />
      <span>
        {isHelpful ? 'Полезно' : 'Это полезно'}
        {helpfulCount > 0 && (
          <span className="ml-1 text-muted-foreground">({helpfulCount})</span>
        )}
      </span>
    </Button>
  );
}

