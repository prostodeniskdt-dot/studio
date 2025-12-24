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
import { useAuth, useUser } from "@/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginAnimation } from "@/components/login-animation";
import { RunningManLoader } from "@/components/running-man-loader";
import { Footer } from "@/components/footer";

const loginSchema = z.object({
  email: z.string().email({ message: "Неверный формат электронной почты" }),
  password: z.string().min(6, { message: "Пароль должен содержать не менее 6 символов" }),
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Неверный формат электронной почты" }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;
type ResetPasswordFormInputs = z.infer<typeof resetPasswordSchema>;

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors, isSubmitting: isResetting },
    reset: resetResetForm,
  } = useForm<ResetPasswordFormInputs>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    if (!auth) {
         toast({
            variant: "destructive",
            title: "Ошибка",
            description: "Сервисы Firebase не инициализированы.",
        });
        return;
    }
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // The useEffect will handle the redirect once the user state is updated.
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Ошибка входа",
            description: "Неверный email или пароль.",
        });
    }
  };

  const onResetPassword: SubmitHandler<ResetPasswordFormInputs> = async (data) => {
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Сервисы Firebase не инициализированы.",
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        variant: "default",
        title: "Письмо отправлено",
        description: "Проверьте свою почту для сброса пароля.",
      });
      setIsResetDialogOpen(false);
      resetResetForm();
    } catch (e: any) {
      let errorMessage = "Произошла ошибка при отправке письма.";
      if (e.code === 'auth/user-not-found') {
        errorMessage = "Пользователь с таким email не найден.";
      } else if (e.code === 'auth/invalid-email') {
        errorMessage = "Неверный формат email.";
      } else if (e.code === 'auth/too-many-requests') {
        errorMessage = "Слишком много запросов. Попробуйте позже.";
      }
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: errorMessage,
      });
    }
  };
  
  if (isUserLoading || isSubmitting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <RunningManLoader />
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
    <div className="w-full min-h-screen bg-background">
      <div className="container relative grid h-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-primary-foreground lg:flex">
          <div className="relative z-20 flex items-center text-lg font-medium">
             <AppLogo className="text-primary" />
          </div>
          
           <div className="relative z-20 flex flex-1 flex-col items-center justify-center">
             <LoginAnimation />
          </div>

          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                &ldquo;Эта система инвентаризации — лучшее, что случалось с моим баром. Просто, эффективно и экономит мне кучу денег!&rdquo;
              </p>
              <footer className="text-sm text-muted-foreground">Владелец бара</footer>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8 flex items-center h-full">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Войдите в свою учетную запись
              </h1>
              <p className="text-sm text-muted-foreground">
                Введите свою почту и пароль для входа
              </p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-2">
                        <Label htmlFor="email">Электронная почта</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            placeholder="you@example.com"
                            className="transition-all duration-200"
                            {...register("email")}
                        />
                        {errors.email && <p className="text-xs text-destructive mt-1 animate-slide-in">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                        <Label htmlFor="password">Пароль</Label>
                        <button
                            type="button"
                            onClick={() => setIsResetDialogOpen(true)}
                            className="text-sm font-medium text-primary hover:underline transition-colors"
                        >
                            Забыли пароль?
                        </button>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className="transition-all duration-200"
                             {...register("password")}
                        />
                         {errors.password && <p className="text-xs text-destructive mt-1 animate-slide-in">{errors.password.message}</p>}
                    </div>

                    <div>
                        <Button type="submit" className="w-full transition-all duration-200" disabled={isSubmitting}>
                           {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Войти
                        </Button>
                    </div>
                    </form>
                </CardContent>
            </Card>
            <p className="px-8 text-center text-sm text-muted-foreground">
              У вас нет аккаунта?{" "}
              <Link
                href="/signup"
                className="underline underline-offset-4 hover:text-primary"
              >
                Создать
              </Link>
              .
            </p>
            <p className="px-8 text-center text-sm text-muted-foreground">
              Продолжая, вы соглашаетесь с нашей{" "}
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
          </div>
        </div>
      </div>

      {/* Dialog для восстановления пароля */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Восстановление пароля</DialogTitle>
            <DialogDescription>
              Введите ваш email, и мы отправим вам ссылку для сброса пароля.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReset(onResetPassword)}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="reset-email">Электронная почта</Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-1"
                  {...registerReset("email")}
                />
                {resetErrors.email && (
                  <p className="text-xs text-destructive mt-1">
                    {resetErrors.email.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsResetDialogOpen(false);
                  resetResetForm();
                }}
                disabled={isResetting}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isResetting}>
                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Отправить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
