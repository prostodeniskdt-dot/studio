'use client';

import Link from 'next/link';
import { LEGAL_DOCUMENTS, SUPPORT_EMAIL, TELEGRAM_SUPPORT } from '@/lib/legal-documents';
import { MessageCircle, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export function Footer() {
  return (
    <footer className="border-t bg-background mt-auto pb-safe">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-sm text-muted-foreground">
          <div className="flex justify-center md:justify-start">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="hover:text-primary text-sm text-muted-foreground h-auto py-1 px-2">
                  Правовая информация
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="flex flex-col gap-3">
                  <Link 
                    href="/legal" 
                    className="text-sm hover:text-primary transition-colors"
                  >
                    Правовая информация
                  </Link>
                  <Link 
                    href={LEGAL_DOCUMENTS.termsOfService.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary transition-colors"
                  >
                    Пользовательское соглашение
                  </Link>
                  <Link 
                    href={LEGAL_DOCUMENTS.privacyPolicy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary transition-colors"
                  >
                    Политика конфиденциальности и ПДн
                  </Link>
                  <Link 
                    href={LEGAL_DOCUMENTS.cookiePolicy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary transition-colors"
                  >
                    Политика cookies
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center justify-center md:justify-end gap-4 flex-wrap">
            <a 
              href={`mailto:${SUPPORT_EMAIL}`}
              className="hover:text-primary transition-colors whitespace-nowrap"
            >
              {SUPPORT_EMAIL}
            </a>
            <a
              href={TELEGRAM_SUPPORT.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-primary transition-colors whitespace-nowrap"
            >
              <MessageCircle className="h-4 w-4" />
              Связаться в Telegram
            </a>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} BarBoss. Все права защищены.
        </div>
      </div>
    </footer>
  );
}

