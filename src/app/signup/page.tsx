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
            <CardTitle className="text-2xl font-bold tracking-tight text-center">Create a new account</CardTitle>
            <CardDescription className="text-center">
              Already have an account? <Link href="/" className="font-medium text-primary hover:underline">Sign In</Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div>
                <Label htmlFor="name">Full name</Label>
                <div className="mt-2">
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email address</Label>
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
                <Label htmlFor="password">Password</Label>
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
                  <Link href="/dashboard">Create account</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
