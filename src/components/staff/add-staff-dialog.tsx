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
import { addStaffMember } from '@/lib/actions';
import { translateRole } from '@/lib/utils';
import { useServerAction } from '@/hooks/use-server-action';

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
    formState: { errors },
  } = useForm<AddStaffFormValues>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      email: '',
      role: 'bartender',
    },
  });

  const { execute: runAddStaff, isLoading: isSubmitting } = useServerAction(addStaffMember, {
    onSuccess: () => {
      onOpenChange(false);
      reset();
    },
    successMessage: "Сотрудник добавлен",
    errorMessage: "Ошибка при добавлении сотрудника"
  });


  const onSubmit = async (data: AddStaffFormValues) => {
    await runAddStaff({ barId, email: data.email, role: data.role });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Пригласить нового сотрудника</DialogTitle>
          <DialogDescription>
            Введите email пользователя, которого хотите добавить в ваш бар, и выберите его роль.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email сотрудника</Label>
            <Input
              id="email"
              placeholder="user@example.com"
              {...register('email')}
            />
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

    