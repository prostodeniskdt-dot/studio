'use client';

import * as React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { HelpCircle, Calculator, BarChart3, Package, Search } from 'lucide-react';
import { faqData, categoryLabels, type FAQItem, type FAQCategory } from '@/lib/faq-data';
import { useDebounce } from '@/hooks/use-debounce';
import Link from 'next/link';
import { FAQHelpfulButton } from './faq-helpful-button';

// Функция для парсинга ссылок в формате Markdown [текст](/path)
function parseAnswerWithLinks(answer: string): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = linkRegex.exec(answer)) !== null) {
    // Добавляем текст до ссылки
    if (match.index > lastIndex) {
      parts.push(answer.substring(lastIndex, match.index));
    }
    
    // Добавляем ссылку
    parts.push(
      <Link
        key={key++}
        href={match[2]}
        className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 underline font-medium transition-colors"
      >
        {match[1]}
      </Link>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Добавляем оставшийся текст
  if (lastIndex < answer.length) {
    parts.push(answer.substring(lastIndex));
  }
  
  return parts.length > 0 ? <>{parts}</> : answer;
}

export function FAQSection() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isVisible, setIsVisible] = React.useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const sectionRef = React.useRef<HTMLDivElement>(null);

  // Анимация появления при прокрутке
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Фильтрация FAQ по поисковому запросу
  const filteredFAQs = React.useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return faqData;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return faqData.filter(faq => {
      return (
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    });
  }, [debouncedSearchQuery]);

  // Группировка по категориям
  const groupedFAQs = React.useMemo(() => {
    const groups: Record<FAQCategory, FAQItem[]> = {
      calculator: [],
      inventory: [],
      products: [],
      general: [],
    };

    filteredFAQs.forEach(faq => {
      groups[faq.category].push(faq);
    });

    // Удаляем пустые категории
    return Object.entries(groups).filter(([_, items]) => items.length > 0) as [FAQCategory, FAQItem[]][];
  }, [filteredFAQs]);

  const getCategoryIcon = (category: FAQCategory) => {
    switch (category) {
      case 'calculator':
        return Calculator;
      case 'inventory':
        return BarChart3;
      case 'products':
        return Package;
      case 'general':
        return HelpCircle;
    }
  };

  return (
    <div
      ref={sectionRef}
      className={`relative mt-8 rounded-lg border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-50 via-yellow-50/80 to-amber-50 dark:from-yellow-950/30 dark:via-yellow-900/20 dark:to-amber-950/30 shadow-lg shadow-yellow-500/10 overflow-hidden transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Анимированная подсветка сверху */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 rounded-t-lg" />
      

      {/* Поиск */}
      <div className="px-6 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск по вопросам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-yellow-300/50 focus:border-yellow-400 focus:ring-yellow-400/20"
          />
        </div>
      </div>

      {/* Accordion с вопросами */}
      <div className="px-6 pb-6 pt-4">
        {groupedFAQs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Вопросы не найдены. Попробуйте изменить поисковый запрос.</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {groupedFAQs.map(([category, items]) => {
              const CategoryIcon = getCategoryIcon(category);
              const categoryLabel = categoryLabels[category].label;
              
              return (
                <div key={category} className="mb-4">
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <CategoryIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {categoryLabel}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({items.length})
                      </span>
                    </h3>
                  </div>
                  {items.map((faq) => (
                    <AccordionItem 
                      key={faq.id} 
                      value={faq.id}
                      className="border-yellow-200/50 dark:border-yellow-800/30 mb-2 rounded-md bg-background/30 hover:bg-background/50 transition-colors"
                    >
                      <AccordionTrigger className="px-4 py-3 text-left font-medium hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <div className="text-sm text-muted-foreground space-y-3">
                          <div className="leading-relaxed">
                            {parseAnswerWithLinks(faq.answer)}
                          </div>
                          <FAQHelpfulButton faqId={faq.id} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </div>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}

