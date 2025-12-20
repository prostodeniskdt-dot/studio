'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  displayName: z.string().min(2, { message: 'Имя должно содержать не менее 2 символов.' }),
  city: z.string().optional(),
  establishment: z.string().optional(),
  phone: z.string().optional(),
  socialLink: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);

  const userRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null,
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userRef);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      city: '',
      establishment: '',
      phone: '',
      socialLink: '',
    }
  });

  React.useEffect(() => {
    if (userProfile) {
      reset({
        displayName: userProfile.displayName || '',
        city: userProfile.city || '',
        establishment: userProfile.establishment || '',
        phone: userProfile.phone || '',
        socialLink: userProfile.socialLink || '',
      });
    }
  }, [userProfile, reset]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!userRef) return;
    
    try {
      await updateDoc(userRef, {
          displayName: data.displayName,
          city: data.city,
          establishment: data.establishment,
          phone: data.phone,
          socialLink: data.socialLink,
      });
      toast({
        title: 'Профиль обновлен',
        description: 'Ваша информация была успешно сохранена.',
      });
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: data,
      }));
    }
  };

  const isLoading = isUserLoading || isLoadingProfile;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ваш профиль</h1>
              <p className="text-muted-foreground">Здесь вы можете обновить свою личную информацию.</p>
            </div>
            <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Помощь по использованию BarBoss</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Продукты</h3>
                    <p className="text-sm text-muted-foreground">
                      В разделе "Продукты" вы можете управлять каталогом товаров. Добавляйте новые продукты, указывайте их характеристики (объем бутылки, вес, стоимость), настраивайте параметры для автоматического заказа. Вы можете архивировать неиспользуемые продукты или удалять их полностью.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Премиксы</h3>
                    <p className="text-sm text-muted-foreground">
                      Премиксы - это готовые смеси и заготовки для коктейлей. Вы можете создавать премиксы, указывая их состав из продуктов. При использовании в калькуляторе премикс можно разложить на ингредиенты для более точного учета.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Инвентаризации</h3>
                    <p className="text-sm text-muted-foreground">
                      Создавайте сессии инвентаризации для учета остатков товаров. Вводите начальные остатки, покупки, продажи и конечные остатки. Система автоматически рассчитает отклонения и покажет отчет с анализом потерь и излишков.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Калькулятор</h3>
                    <p className="text-sm text-muted-foreground">
                      Калькулятор помогает определить объем жидкости в бутылке на основе веса и уровня жидкости. Введите вес полной бутылки, пустой бутылки, текущий вес и уровень жидкости (в см). Система рассчитает точный объем и позволит отправить результат в активную инвентаризацию.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Заказы на закупку</h3>
                    <p className="text-sm text-muted-foreground">
                      На основе завершенных инвентаризаций система может автоматически создавать заказы на закупку для продуктов, остатки которых ниже минимального уровня. Заказы группируются по поставщикам и могут быть отредактированы перед отправкой.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Аналитика</h3>
                    <p className="text-sm text-muted-foreground">
                      В разделе "Аналитика" вы можете сравнивать данные по нескольким завершенным инвентаризациям, анализировать динамику остатков и выявлять тенденции.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Профиль</h3>
                    <p className="text-sm text-muted-foreground">
                      В профиле вы можете обновить свою личную информацию: имя, город, название заведения, контактные данные. Эта информация видна администраторам системы.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Информация о пользователе</CardTitle>
          <CardDescription>Эта информация будет видна администраторам системы.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Личная информация
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Отображаемое имя</Label>
                    <Input id="displayName" {...register('displayName')} />
                    {errors.displayName && <p className="text-xs text-destructive mt-1">{errors.displayName.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="city">Город</Label>
                        <Input id="city" placeholder="Москва" {...register('city')} />
                        {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="establishment">Заведение</Label>
                        <Input id="establishment" placeholder="Бар 'Мечта'" {...register('establishment')} />
                        {errors.establishment && <p className="text-xs text-destructive mt-1">{errors.establishment.message}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Контакты
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Номер телефона</Label>
                    <Input id="phone" type="tel" placeholder="+7 (999) 123-45-67" {...register('phone')} />
                    {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="socialLink">Ссылка на Telegram / WhatsApp</Label>
                    <Input id="socialLink" placeholder="@username" {...register('socialLink')} />
                    {errors.socialLink && <p className="text-xs text-destructive mt-1">{errors.socialLink.message}</p>}
                  </div>
                </div>
              </div>
            </div>
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить изменения
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
