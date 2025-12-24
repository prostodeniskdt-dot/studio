'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/app-logo";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, useUser, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";
import { logConsent } from "@/lib/consent-logger";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Имя должно содержать не менее 2 символов" }),
  email: z.string().email({ message: "Неверный формат электронной почты" }),
  password: z.string().min(6, { message: "Пароль должен содержать не менее 6 символов" }),
  city: z.string().optional(),
  establishment: z.string().optional(),
  phone: z.string().optional(),
  socialLink: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Необходимо принять пользовательское соглашение и политику конфиденциальности"
  }),
});

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Сервисы Firebase не инициализированы.",
      });
      return;
    }

    const extraDetails = {
      city: data.city,
      establishment: data.establishment,
      phone: data.phone,
      socialLink: data.socialLink,
    };

    const detailsToStore = Object.fromEntries(
      Object.entries(extraDetails).filter(([_, v]) => v)
    );
    
    if (typeof window !== 'undefined' && Object.keys(detailsToStore).length > 0) {
      sessionStorage.setItem('new_user_details', JSON.stringify(detailsToStore));
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      const profileData = {
        displayName: data.name,
      };

      await updateProfile(userCredential.user, profileData);

      // Логирование согласия
      if (firestore) {
        const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;
        
        // Логируем согласие в коллекцию consent_logs
        await logConsent(
          firestore,
          userCredential.user.uid,
          'terms_and_privacy',
          true,
          LEGAL_DOCUMENTS.termsOfService.version
        );

        // Сохраняем согласие в профиле пользователя
        const userRef = doc(firestore, 'users', userCredential.user.uid);
        await updateDoc(userRef, {
          'consents.termsAndPrivacy': {
            accepted: true,
            version: LEGAL_DOCUMENTS.termsOfService.version,
            timestamp: serverTimestamp(),
            userAgent,
          }
        });
      }
      
    } catch(e: any) {
        if (typeof window !== 'undefined' && Object.keys(detailsToStore).length > 0) {
            sessionStorage.removeItem('new_user_details');
        }
        
        let description = "Произошла неизвестная ошибка.";
        if (e.code === 'auth/email-already-in-use') {
            description = 'Этот email уже зарегистрирован. Пожалуйста, войдите или используйте другой адрес.';
        } else if (e.message) {
            description = e.message;
        }
        
        toast({
            variant: "destructive",
            title: "Ошибка регистрации",
            description: description,
        });
    }
  };
  
  if (isUserLoading || isSubmitting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <AppLogo />
        </div>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight text-center">Создать новую учетную запись</CardTitle>
            <CardDescription className="text-center">
              Уже есть аккаунт? <Link href="/" className="font-medium text-primary hover:underline">Войти</Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 gap-y-6">
                <div>
                  <Label htmlFor="name">Полное имя</Label>
                  <div className="mt-2">
                    <Input id="name" type="text" autoComplete="name" required placeholder="Иван Иванов" {...register("name")} />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Адрес электронной почты</Label>
                  <div className="mt-2">
                    <Input id="email" type="email" autoComplete="email" required placeholder="you@example.com" {...register("email")} />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <div className="mt-2">
                    <Input id="password" type="password" autoComplete="new-password" required {...register("password")} />
                    {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="city">Город</Label>
                        <Input id="city" placeholder="Москва" {...register('city')} />
                        {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="establishment">Заведение</Label>
                        <Input id="establishment" placeholder="Бар 'Мечта'" {...register('establishment')} />
                        {errors.establishment && <p className="text-xs text-destructive mt-1">{errors.establishment.message}</p>}
                    </div>
                </div>
                 <div>
                  <Label htmlFor="phone">Номер телефона</Label>
                  <Input id="phone" type="tel" placeholder="+7 (999) 123-45-67" {...register('phone')} />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="socialLink">Ссылка на Telegram / WhatsApp</Label>
                  <Input id="socialLink" placeholder="@username" {...register('socialLink')} />
                  {errors.socialLink && <p className="text-xs text-destructive mt-1">{errors.socialLink.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    {...register("acceptTerms")}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="acceptTerms" className="text-sm cursor-pointer leading-relaxed">
                    Я принимаю{' '}
                    <Link
                      href={LEGAL_DOCUMENTS.termsOfService.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Пользовательское соглашение
                    </Link>
                    {' '}и{' '}
                    <Link
                      href={LEGAL_DOCUMENTS.privacyPolicy.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Политику конфиденциальности
                    </Link>
                    {' '}и даю согласие на обработку персональных данных
                  </Label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>
                )}
              </div>

              <div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Создать аккаунт
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
