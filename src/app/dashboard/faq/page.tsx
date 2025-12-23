'use client';

import { FAQSection } from '@/components/faq/faq-section';

export default function FAQPage() {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Часто задаваемые вопросы</h1>
        <p className="text-muted-foreground mt-2">
          Найдите ответы на популярные вопросы по использованию приложения
        </p>
      </div>
      <FAQSection />
    </div>
  );
}

