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
import { collection, getDocs, query, where, doc, setDoc, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const addStaffSchema = z.object({
  email: z.string().email('Неверный формат email.'),
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
      email: '',
      role: 'bartender',
    },
  });

  const firestore = useFirestore();
  const { toast } = useToast();

  const onSubmit = async (data: AddStaffFormValues) => {
    if (!firestore) return;
    let userId: string | null = null;
    let userDocData: any = null;

    try {
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
        userId = userDoc.id;
        userDocData = userDoc.data();
        
        const memberRef = doc(firestore, 'bars', barId, 'members', userId);
        
        // --- FIX: Create the correct data object based on the schema ---
        const memberData = {
            userId: userId,
            role: data.role
        };
        // --- END FIX ---
        
        await setDoc(memberRef, memberData);
        
        toast({ title: "Сотрудник добавлен", description: `${userDocData.displayName} (${data.email}) теперь в вашей команде.` });
        onOpenChange(false);
        reset();

    } catch(error: any) {
        // Construct the correct data that was SUPPOSED to be written for a more useful error message.
        const intendedData = { userId: userId, role: data.role };

        errorEmitter.emit('permission-error', new FirestorePermissionError({
             path: `bars/${barId}/members/${userId || '(lookup failed)'}`,
             operation: 'create',
             requestResourceData: intendedData // Use the corrected data object here.
        }));
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
