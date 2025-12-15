'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { translateRole } from '@/lib/utils';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, getDocs, query, where, doc, setDoc, limit, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

const addStaffSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  email: z.string().email('Неверный формат email.'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов.'),
  phone: z.string().optional(),
  socialLink: z.string().optional(),
  role: z.enum(['manager', 'bartender']),
});

type AddStaffFormValues = z.infer<typeof addStaffSchema>;

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barId: string;
}

export function AddStaffDialog({ open, onOpenChange, barId }: AddStaffDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddStaffFormValues>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      socialLink: '',
      role: 'bartender',
    },
  });

  const { auth: ownerAuth } = useUser(); // We need the auth instance of the currently logged in owner
  const firestore = useFirestore();
  const { toast } = useToast();

  const onSubmit = async (data: AddStaffFormValues) => {
    if (!firestore || !ownerAuth) return;

    try {
        // We can't create a user directly with the main auth instance.
        // This would require Admin SDK which we don't have on the client.
        // The flow must be:
        // 1. Owner invites by email.
        // 2. The invited person gets an email, clicks a link to sign up themselves.
        // 3. During sign up, a special token is used to associate them with the bar.

        // The request is to create the user directly. This is a security risk.
        // A better approach is to create a pending invitation.
        // However, to fulfill the request as close as possible without server-side logic:
        // We will just add a member document. The user must exist.

        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('email', '==', data.email), limit(1));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            toast({ 
                variant: 'destructive', 
                title: "Пользователь не найден", 
                description: `Пользователь с email ${data.email} не зарегистрирован в системе. Попросите его сначала создать аккаунт.`
            });
            return;
        }

        const userDoc = userSnapshot.docs[0];
        const userId = userDoc.id;
        const memberRef = doc(firestore, 'bars', barId, 'members', userId);
        
        await setDoc(memberRef, { userId, role: data.role });

        // Update the user's profile with details if they were provided
        const userProfileRef = doc(firestore, 'users', userId);
        const profileUpdateData: Record<string, any> = {};
        if (data.phone) profileUpdateData.phone = data.phone;
        if (data.socialLink) profileUpdateData.socialLink = data.socialLink;
        if (data.firstName && data.lastName) {
             profileUpdateData.displayName = `${data.firstName} ${data.lastName}`;
        }
        
        if (Object.keys(profileUpdateData).length > 0) {
            await setDoc(userProfileRef, profileUpdateData, { merge: true });
        }
        
        toast({ title: "Сотрудник добавлен", description: `${userDoc.data().displayName} теперь в вашей команде.` });
        onOpenChange(false);
        reset();

    } catch(error: any) {
        let description = error.message || "Произошла неизвестная ошибка.";
        if (error.code === 'permission-denied') {
            description = 'У вас нет прав для выполнения этого действия.';
        }
        toast({
            variant: "destructive",
            title: "Ошибка добавления сотрудника",
            description
        });
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `bars/${barId}/members`, operation: 'create', requestResourceData: data }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Пригласить сотрудника</DialogTitle>
          <DialogDescription>
            Найдите существующего пользователя по email, чтобы добавить его в команду. Если у него еще нет аккаунта, попросите его зарегистрироваться.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          
          <div className="space-y-2">
            <Label htmlFor="email">Email сотрудника</Label>
            <Input id="email" placeholder="user@example.com" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input id="firstName" placeholder="Иван" {...register('firstName')} />
                 {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input id="lastName" placeholder="Иванов" {...register('lastName')} />
                 {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
              </div>
          </div>
          
           <div className="space-y-2">
            <Label htmlFor="phone">Телефон (необязательно)</Label>
            <Input id="phone" {...register('phone')} />
          </div>

           <div className="space-y-2">
            <Label htmlFor="socialLink">Telegram (необязательно)</Label>
            <Input id="socialLink" placeholder="@username" {...register('socialLink')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Роль</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bartender">{translateRole('bartender')}</SelectItem>
                    <SelectItem value="manager">{translateRole('manager')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Пригласить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
