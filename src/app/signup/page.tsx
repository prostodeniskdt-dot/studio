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
import { useAuth, useFirestore } from "@/firebase";
import { initiateEmailSignUpAndCreateUser } from "@/firebase/non-blocking-login";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Имя должно содержать не менее 2 символов" }),
  email: z.string().email({ message: "Неверный формат электронной почты" }),
  password: z.string().min(6, { message: "Пароль должен содержать не менее 6 символов" }),
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
    if (!auth || !firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Сервисы Firebase не инициализированы.",
      });
      return;
    }
    try {
      // The function now awaits the full sign-up and document creation process
      await initiateEmailSignUpAndCreateUser(auth, firestore, data.email, data.password, data.name);
      
      toast({
        title: "Аккаунт создан",
        description: "Выполняется вход...",
      });
      // The useUser effect will handle the redirect on successful sign-in
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Ошибка регистрации",
            description: e.message,
        });
    }
  };
  
  if (isUserLoading || user) {
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
              <div>
                <Label htmlFor="name">Полное имя</Label>
                <div className="mt-2">
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Иван Иванов"
                    {...register("name")}
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Адрес электронной почты</Label>
                <div className="mt-2">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                     {...register("email")}
                  />
                   {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="password">Пароль</Label>
                <div className="mt-2">
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    {...register("password")}
                  />
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Создать аккаунт
                </Button>
              </div>
            </form>
             <p className="mt-6 text-center text-sm text-muted-foreground">
              Создавая аккаунт, вы соглашаетесь с нашей{" "}
              <Link
                href="https://docs.google.com/document/d/1v8xS6_m7dttEcfDEqSkVh3Z9byYx3HxCbt4zQMSTxzg/edit?tab=t.0"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-primary"
              >
                Политикой конфиденциальности
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
