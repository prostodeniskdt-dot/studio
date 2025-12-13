'use client';

import * as React from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function AdminDebugPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [testResult, setTestResult] = React.useState<string | null>(null);
  const [isTesting, setIsTesting] = React.useState(false);

  const runTest = async () => {
    if (!firestore || !user) {
      setTestResult('Firestore или пользователь недоступны.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      const roleRef = doc(firestore, 'roles_admin', user.uid);
      const docSnap = await getDoc(roleRef);

      if (docSnap.exists()) {
        setTestResult(`✅ Успех! Документ найден. Данные: ${JSON.stringify(docSnap.data())}`);
      } else {
        setTestResult('ℹ️ Документ не найден (exists() = false). Это ожидаемо, если роль еще не создана. Ошибки прав доступа не было.');
      }
    } catch (e: any) {
      setTestResult(`❌ Ошибка!
Код: ${e.code || 'N/A'}
Сообщение: ${e.message}
Это означает, что правила безопасности блокируют GET-запрос, или проект/правила не синхронизированы.`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Страница отладки прав администратора</CardTitle>
          <CardDescription>
            Эта страница помогает диагностировать проблемы с доступом к документу роли администратора.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Информация о клиенте:</h3>
            {isUserLoading ? <Loader2 className="animate-spin"/> : (
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li><span className="font-medium text-foreground">Project ID:</span> {firebaseConfig.projectId}</li>
                <li><span className="font-medium text-foreground">User UID:</span> {user?.uid ?? 'N/A'}</li>
                <li><span className="font-medium text-foreground">User Email:</span> {user?.email ?? 'N/A'}</li>
              </ul>
            )}
          </div>
          <div>
             <Button onClick={runTest} disabled={isTesting || isUserLoading}>
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Проверить доступ к `roles_admin`
            </Button>
          </div>

           {testResult && (
             <div className="p-4 bg-muted rounded-md">
                <h3 className="font-semibold mb-2">Результат проверки:</h3>
                <pre className="text-sm whitespace-pre-wrap font-mono">{testResult}</pre>
            </div>
           )}

        </CardContent>
      </Card>
       <Card>
        <CardHeader>
            <CardTitle>Интерпретация результатов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <p><strong className="text-green-600">✅ Успех!</strong> — означает, что правила работают, и документ роли существует. Проблема в другом месте.</p>
            <p><strong className="text-blue-600">ℹ️ Документ не найден</strong> — означает, что правила работают (GET-запрос прошел), но документа для вашей роли еще нет. Механизм само-активации должен его создать.</p>
            <p><strong className="text-red-600">❌ Ошибка!</strong> — означает, что правила безопасности заблокировали запрос. Наиболее вероятная причина: правила в облаке не совпадают с кодом, или клиент подключен не к тому проекту.</p>
        </CardContent>
       </Card>
    </div>
  );
}
