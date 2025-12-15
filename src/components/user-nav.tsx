'use client';
import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser, useAuth } from '@/firebase';
import { LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function UserNav() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = () => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Ошибка выхода",
            description: "Служба аутентификации недоступна."
        });
        return;
    };
    signOut(auth).then(() => {
        // This will trigger the useEffect in the layout/page to redirect.
        router.push('/');
        toast({
            title: "Вы вышли из системы"
        });
    }).catch((error) => {
        console.error("Logout Error:", error);
        toast({
            variant: "destructive",
            title: "Ошибка выхода",
            description: "Не удалось выйти из системы. Пожалуйста, попробуйте еще раз."
        });
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (isUserLoading) {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  }

  if (!user) {
    return (
        <Button asChild>
            <Link href="/">Войти</Link>
        </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL ?? `https://avatar.vercel.sh/${user.email}.png`} alt={user.displayName ?? 'User'} />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || 'Пользователь'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/dashboard/profile">
              <UserIcon className="mr-2 h-4 w-4"/>
              Профиль
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4"/>
            Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
