'use client';

import * as React from 'react';
import { Loader2, UserMinus } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthSession } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

type MemberRow = {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: { id: string; displayName: string; email: string; role: string };
};

export default function TeamPage() {
  const { user, refresh } = useAuthSession();
  const { toast } = useToast();
  const [members, setMembers] = React.useState<MemberRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'staff' | 'viewer'>('staff');
  const [adding, setAdding] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const isOwner = user?.barAccess === 'owner';

  const load = React.useCallback(async () => {
    if (!isOwner) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/bar/members', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || 'Не удалось загрузить команду');
      }
      setMembers(json.members as MemberRow[]);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: e instanceof Error ? e.message : String(e),
      });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [isOwner, toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/bar/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || 'Не удалось добавить');
      }
      setEmail('');
      setRole('staff');
      await load();
      await refresh();
      toast({ title: 'Пользователь добавлен в команду' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Не удалось добавить',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(memberUserId: string) {
    setRemovingId(memberUserId);
    try {
      const res = await fetch(`/api/bar/members/${memberUserId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || 'Не удалось удалить');
      }
      await load();
      toast({ title: 'Участник удалён из команды' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRemovingId(null);
    }
  }

  if (!user) {
    return null;
  }

  if (!isOwner) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Команда бара" />
        <Card>
          <CardHeader>
            <CardTitle>Доступ только для владельца бара</CardTitle>
            <CardDescription>
              Управлять приглашениями может только аккаунт, которому принадлежит бар. Сотрудники с ролью
              «наблюдатель» или «бармен» в чужой команде открывают общие инвентаризации автоматически после
              входа.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Команда бара"
        description="Добавьте коллег по email (аккаунт уже должен быть зарегистрирован). Все работают с одной инвентаризацией и каталогом этого бара."
      />

      <Card>
        <CardHeader>
          <CardTitle>Пригласить в команду</CardTitle>
          <CardDescription>Роль «Бармен» — полное редактирование; «Наблюдатель» — только просмотр.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="team-email">Email пользователя</Label>
              <Input
                id="team-email"
                type="email"
                autoComplete="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
              />
            </div>
            <div className="w-full sm:w-44 space-y-2">
              <Label>Роль</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'staff' | 'viewer')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Бармен</SelectItem>
                  <SelectItem value="viewer">Наблюдатель</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={adding || !email.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Добавить'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Текущая команда</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || members === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока никого не добавляли.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль в приложении</TableHead>
                  <TableHead>Доступ к бару</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.user.displayName}</TableCell>
                    <TableCell>{m.user.email}</TableCell>
                    <TableCell className="text-muted-foreground">{m.user.role}</TableCell>
                    <TableCell>{m.role === 'viewer' ? 'Наблюдатель' : 'Бармен'}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Удалить из команды"
                        disabled={removingId === m.userId}
                        onClick={() => void handleRemove(m.userId)}
                      >
                        {removingId === m.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
