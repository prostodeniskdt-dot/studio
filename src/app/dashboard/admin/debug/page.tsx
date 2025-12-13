'use client';

import * as React from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminDebugPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [testResult, setTestResult] = React.useState<string | null>(null);
  const [docExists, setDocExists] = React.useState<boolean | null>(null);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isActivating, setIsActivating] = React.useState(false);

  const runTest = React.useCallback(async () => {
    if (!firestore || !user) {
      setTestResult('Firestore или пользователь недоступны.');
      return;
    }
    setIsTesting(true);
    setDocExists(null);
    setTestResult(null);

    try {
      const roleRef = doc(firestore, 'roles_admin', user.uid);
      const docSnap = await getDoc(roleRef);

      setDocExists(docSnap.exists());

      if (docSnap.exists()) {
        setTestResult(`✅ Успех! Документ найден (exists() = true). Данные: ${JSON.stringify(docSnap.data())}`);
      } else {
        setTestResult('ℹ️ Документ не найден (exists() = false). Это ожидаемо, если роль еще не создана. Ошибки прав доступа не было.');
      }
    } catch (e: any) {
      setDocExists(false);
      setTestResult(`❌ Ошибка!
Код: ${e.code || 'N/A'}
Сообщение: ${e.message}
Это означает, что правила безопасности блокируют GET-запрос, или проект/правила не синхронизированы.`);
    } finally {
      setIsTesting(false);
    }
  }, [firestore, user]);


  const handleActivateAdmin = async () => {
    if (!firestore || !user) return;
    setIsActivating(true);
    try {
        const roleRef = doc(firestore, 'roles_admin', user.uid);
        await setDoc(roleRef, { isAdmin: true });
        toast({
            title: "Роль администратора активирована!",
            description: "Теперь у вас есть доступ к панели администратора.",
        });
        // Re-run the test to show the updated status
        await runTest();
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Ошибка активации",
            description: e.message || "Не удалось создать документ роли. Проверьте правила безопасности."
        });
    } finally {
        setIsActivating(false);
    }
  }

  // Automatically run the test once the user is loaded.
  React.useEffect(() => {
    if (user && firestore) {
      runTest();
    }
  }, [user, firestore, runTest]);


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

           {user?.email === 'prostodeniskdt@gmail.com' && docExists === false && !isTesting && (
            <Card className="border-primary">
                <CardHeader>
                    <CardTitle>Активация роли Администратора</CardTitle>
                    <CardDescription>Ваш документ роли администратора не найден. Нажмите кнопку ниже, чтобы создать его.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleActivateAdmin} disabled={isActivating}>
                        {isActivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Активировать админа
                    </Button>
                </CardContent>
            </Card>
           )}

        </CardContent>
      </Card>
       <Card>
        <CardHeader>
            <CardTitle>Интерпретация результатов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <p><strong className="text-green-600">✅ Успех! (exists() = true)</strong> — означает, что все работает правильно. Роль администратора активна.</p>
            <p><strong className="text-blue-600">ℹ️ Документ не найден (exists() = false)</strong> — означает, что правила РАЗРЕШАЮТ чтение, но самого документа еще нет. Используйте кнопку активации.</p>
            <p><strong className="text-red-600">❌ Ошибка! (permission-denied)</strong> — означает, что правила безопасности заблокировали запрос. Вероятная причина: правила в облаке не совпадают с кодом, или клиент подключен не к тому проекту.</p>
        </CardContent>
       </Card>
    </div>
  );
}
