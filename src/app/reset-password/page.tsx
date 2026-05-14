'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function ResetPasswordInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const token = sp.get('token') ?? '';
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Отсутствует токен сброса.' });
      return;
    }
    if (pw.length < 6) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пароль минимум 6 символов.' });
      return;
    }
    if (pw !== pw2) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пароли не совпадают.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, newPassword: pw }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
      toast({ title: 'Пароль изменён', description: 'Теперь вы можете войти с новым паролем.' });
      router.push('/');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Не удалось изменить пароль.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Сброс пароля</CardTitle>
          <CardDescription>Введите новый пароль для вашей учетной записи.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Новый пароль</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Повторите пароль</Label>
              <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
