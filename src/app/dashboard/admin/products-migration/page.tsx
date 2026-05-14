'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';

interface DiagnosisData {
  total: number;
  premixes: number;
  inLibrary: number;
  personal: number;
  oldProducts: number;
  withBarIdAndInLibrary: number;
  samples: {
    oldProducts: Array<{ id: string; name: string; isInLibrary?: boolean; barId?: string; category?: string }>;
    libraryProducts: Array<{ id: string; name: string }>;
    anomalies: Array<{ id: string; name: string; isInLibrary?: boolean; barId?: string }>;
  };
}

interface MigrationData {
  copiedToLibrary: number;
  skipped: {
    total: number;
    alreadyInLibrary: number;
    personal: number;
    premixes: number;
  };
  total: number;
  duration: string;
  samples: {
    copied: Array<{ id: string; name: string }>;
    skippedPersonal: Array<{ id: string; name: string; barId: string }>;
    skippedInLibrary: Array<{ id: string; name: string }>;
  };
}

export default function ProductsMigrationPage() {
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData | null>(null);
  const [migrationData, setMigrationData] = useState<MigrationData | null>(null);
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
  const [isLoadingMigration, setIsLoadingMigration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const runDiagnosis = async () => {
    setIsLoadingDiagnosis(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/diagnose-products');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка при диагностике');
      }

      setDiagnosisData(result.data);
      setSuccessMessage('Диагностика выполнена успешно');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoadingDiagnosis(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('Вы уверены, что хотите скопировать старые продукты в библиотеку? Эта операция обновит базу данных.')) {
      return;
    }

    setIsLoadingMigration(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/migrate-products', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка при миграции');
      }

      setMigrationData(result.data);
      setSuccessMessage(`Миграция завершена успешно! Скопировано продуктов: ${result.data.copiedToLibrary}`);
      
      // Автоматически обновляем диагностику после миграции
      setTimeout(() => {
        runDiagnosis();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoadingMigration(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Миграция продуктов в библиотеку</h1>
          <p className="text-muted-foreground mt-2">
            Диагностика и копирование старых продуктов в общую библиотеку
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Успешно</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Диагностика */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Диагностика продуктов
            </CardTitle>
            <CardDescription>
              Проверка текущего состояния продуктов в базе данных
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runDiagnosis}
              disabled={isLoadingDiagnosis}
              className="w-full"
            >
              {isLoadingDiagnosis ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверка...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Запустить диагностику
                </>
              )}
            </Button>

            {diagnosisData && (
              <div className="space-y-3 pt-4 border-t">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Всего продуктов:</span>
                    <div className="font-semibold text-lg">{diagnosisData.total}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">В библиотеке:</span>
                    <div className="font-semibold text-lg text-green-600">{diagnosisData.inLibrary}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Старые (кандидаты):</span>
                    <div className="font-semibold text-lg text-orange-600">{diagnosisData.oldProducts}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Персональные:</span>
                    <div className="font-semibold text-lg">{diagnosisData.personal}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Премиксы:</span>
                    <div className="font-semibold text-lg">{diagnosisData.premixes}</div>
                  </div>
                  {diagnosisData.withBarIdAndInLibrary > 0 && (
                    <div>
                      <span className="text-muted-foreground">Аномалии:</span>
                      <div className="font-semibold text-lg text-red-600">{diagnosisData.withBarIdAndInLibrary}</div>
                    </div>
                  )}
                </div>

                {diagnosisData.oldProducts > 0 && (
                  <div className="pt-2">
                    <p className="text-sm font-semibold mb-1">Примеры старых продуктов:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {diagnosisData.samples.oldProducts.slice(0, 5).map((p) => (
                        <li key={p.id}>• {p.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Миграция */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Копирование в библиотеку
            </CardTitle>
            <CardDescription>
              Копирование старых продуктов (без barId) в общую библиотеку
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runMigration}
              disabled={isLoadingMigration || isLoadingDiagnosis}
              variant="default"
              className="w-full"
            >
              {isLoadingMigration ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Копирование...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Запустить миграцию
                </>
              )}
            </Button>

            {migrationData && (
              <div className="space-y-3 pt-4 border-t">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Скопировано:</span>
                    <div className="font-semibold text-lg text-green-600">{migrationData.copiedToLibrary}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Пропущено:</span>
                    <div className="font-semibold text-lg">{migrationData.skipped.total}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Уже в библиотеке:</span>
                    <div className="text-sm">{migrationData.skipped.alreadyInLibrary}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Персональные:</span>
                    <div className="text-sm">{migrationData.skipped.personal}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Премиксы:</span>
                    <div className="text-sm">{migrationData.skipped.premixes}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Время:</span>
                    <div className="text-sm">{migrationData.duration}</div>
                  </div>
                </div>

                {migrationData.samples.copied.length > 0 && (
                  <div className="pt-2">
                    <p className="text-sm font-semibold mb-1">Примеры скопированных:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {migrationData.samples.copied.slice(0, 5).map((p) => (
                        <li key={p.id}>• {p.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Важно</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Диагностика показывает текущее состояние продуктов в базе данных</li>
            <li>Миграция копирует старые продукты (без barId) в библиотеку, устанавливая isInLibrary: true</li>
            <li>ID продуктов сохраняются, поэтому ссылки в других коллекциях не нарушаются</li>
            <li>Рекомендуется сначала запустить диагностику, затем миграцию</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

