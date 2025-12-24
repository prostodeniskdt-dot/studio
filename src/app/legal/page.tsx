'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LEGAL_DOCUMENTS, SUPPORT_EMAIL, TELEGRAM_SUPPORT } from '@/lib/legal-documents';
import Link from 'next/link';
import { ExternalLink, Mail, MessageCircle } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Правовая информация</h1>
          <p className="text-muted-foreground mt-2">
            Документы и информация о сервисе BarBoss
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{LEGAL_DOCUMENTS.termsOfService.title}</CardTitle>
              <CardDescription>Версия {LEGAL_DOCUMENTS.termsOfService.version}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={LEGAL_DOCUMENTS.termsOfService.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Открыть документ <ExternalLink className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{LEGAL_DOCUMENTS.privacyPolicy.title}</CardTitle>
              <CardDescription>Версия {LEGAL_DOCUMENTS.privacyPolicy.version}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={LEGAL_DOCUMENTS.privacyPolicy.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Открыть документ <ExternalLink className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{LEGAL_DOCUMENTS.cookiePolicy.title}</CardTitle>
              <CardDescription>Версия {LEGAL_DOCUMENTS.cookiePolicy.version}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={LEGAL_DOCUMENTS.cookiePolicy.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Открыть документ <ExternalLink className="h-4 w-4" />
              </Link>
              <div className="pt-2">
                <Link
                  href="/legal/cookies"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Настроить cookies
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{LEGAL_DOCUMENTS.dataProcessingConsent.title}</CardTitle>
              <CardDescription>Версия {LEGAL_DOCUMENTS.dataProcessingConsent.version}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={LEGAL_DOCUMENTS.dataProcessingConsent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Открыть документ <ExternalLink className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Контакты</CardTitle>
            <CardDescription>Свяжитесь с нами по вопросам персональных данных</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {SUPPORT_EMAIL}
              </a>
              <a
                href={TELEGRAM_SUPPORT.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <MessageCircle className="h-4 w-4" />
                Связаться в Telegram (@{TELEGRAM_SUPPORT.username})
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              По вопросам обработки персональных данных, запросам на удаление или уточнение данных обращайтесь по указанным контактам.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

