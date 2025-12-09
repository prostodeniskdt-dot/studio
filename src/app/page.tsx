import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/app-logo";
import { CheckCircle } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="w-full min-h-full bg-background">
      <div className="container relative grid h-full flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1579311318434-2c343b3b3f29?q=80&w=1974&auto=format&fit=crop)",
              filter: "grayscale(100%) brightness(0.5)",
            }}
          />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <AppLogo />
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;Эта система инвентаризации — лучшее, что случалось с моим баром. Просто, эффективно и экономит мне кучу денег!&rdquo;
              </p>
              <footer className="text-sm">Владелец бара</footer>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8">
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
                    <form className="space-y-4">
                    <div>
                        <Label htmlFor="email">Электронная почта</Label>
                        <div className="mt-1">
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            placeholder="you@example.com"
                        />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                        <Label htmlFor="password">Пароль</Label>
                        <div className="text-sm">
                            <a href="#" className="font-medium text-primary hover:underline">
                            Забыли пароль?
                            </a>
                        </div>
                        </div>
                        <div className="mt-1">
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                        />
                        </div>
                    </div>

                    <div>
                        <Button type="submit" className="w-full" asChild>
                        {/* In a real app, this would trigger a login action. For the demo, it navigates to the dashboard. */}
                        <Link href="/dashboard">Войти</Link>
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
    </div>
  );
}
