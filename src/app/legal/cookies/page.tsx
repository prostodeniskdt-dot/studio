'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LEGAL_DOCUMENTS } from '@/lib/legal-documents';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const COOKIE_CONSENT_KEY = 'cookie_consent';

export default function CookieSettingsPage() {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent) {
      try {
        const data = JSON.parse(consent);
        setAnalytics(data.analytics || false);
        setMarketing(data.marketing || false);
      } catch (error) {
        console.error('Failed to parse cookie consent:', error);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
      version: LEGAL_DOCUMENTS.cookiePolicy.version
    }));
    toast({
      title: 'Настройки сохранены',
      description: 'Ваши предпочтения по cookies были обновлены.',
    });
    // Здесь можно отправить настройки на сервер
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Настройки cookies</CardTitle>
          <CardDescription>
            Управляйте использованием cookies на этом сайте.{' '}
            <Link 
              href={LEGAL_DOCUMENTS.cookiePolicy.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Подробнее в политике cookies
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics">Аналитика</Label>
                <p className="text-sm text-muted-foreground">
                  Позволяет собирать анонимную статистику использования сайта
                </p>
              </div>
              <Switch
                id="analytics"
                checked={analytics}
                onCheckedChange={setAnalytics}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">Маркетинг</Label>
                <p className="text-sm text-muted-foreground">
                  Используется для персонализации рекламы (в настоящее время не используется)
                </p>
              </div>
              <Switch
                id="marketing"
                checked={marketing}
                onCheckedChange={setMarketing}
                disabled
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} className="w-full">
              Сохранить настройки
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

