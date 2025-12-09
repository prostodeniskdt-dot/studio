import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/app-logo";

export default function SignupPage() {
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
            <form className="space-y-6">
              <div>
                <Label htmlFor="name">Полное имя</Label>
                <div className="mt-2">
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Иван Иванов"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Адрес электронной почты</Label>
                <div className="mt-2">
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
                <Label htmlFor="password">Пароль</Label>
                <div className="mt-2">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full" asChild>
                  <Link href="/dashboard">Создать аккаунт</Link>
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
