'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LEGAL_DOCUMENTS } from '@/lib/legal-documents';
import Link from 'next/link';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent';

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      analytics: true,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: LEGAL_DOCUMENTS.cookiePolicy.version
    }));
    setShowBanner(false);
    // Здесь можно отправить согласие на сервер
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: LEGAL_DOCUMENTS.cookiePolicy.version
    }));
    setShowBanner(false);
  };

  const handleCustomize = () => {
    // Переход на страницу настроек cookies
    window.location.href = '/legal/cookies';
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              Мы используем cookies для улучшения работы сайта.{' '}
              <Link 
                href={LEGAL_DOCUMENTS.cookiePolicy.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                Подробнее
              </Link>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleReject}>
              Отклонить необязательные
            </Button>
            <Button variant="outline" size="sm" onClick={handleCustomize}>
              Настроить
            </Button>
            <Button size="sm" onClick={handleAccept}>
              Принять
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

