'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Supplier } from '@/lib/types';
import { doc, collection, setDoc } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, 'Название должно содержать не менее 2 символов.'),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Неверный формат email.').optional().or(z.literal('')),
});

type SupplierFormValues = z.infer<typeof formSchema>;

interface SupplierFormProps {
    barId: string;
    supplier?: Supplier;
    onFormSubmit: () => void;
}

export function SupplierForm({ barId, supplier, onFormSubmit }: SupplierFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);


  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: supplier ? {
      name: supplier.name,
      contactName: supplier.contactName ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
    } : {
      name: '',
      contactName: '',
      phone: '',
      email: '',
    },
  });

  async function onSubmit(data: SupplierFormValues) {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
        const supplierRef = supplier ? doc(firestore, 'bars', barId, 'suppliers', supplier.id) : doc(collection(firestore, 'bars', barId, 'suppliers'));
        const supplierData = {
          ...data,
          id: supplierRef.id,
          barId: barId,
        };

        await setDoc(supplierRef, supplierData, { merge: true });
        toast({ title: supplier ? 'Поставщик обновлен' : 'Поставщик создан' });
        onFormSubmit();
    } catch(error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `bars/${barId}/suppliers`, operation: 'write' }));
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название компании</FormLabel>
              <FormControl>
                <Input placeholder="ООО 'НапиткиМира'" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Контактное лицо</FormLabel>
              <FormControl>
                <Input placeholder="Иван Петров" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Телефон</FormLabel>
              <FormControl>
                <Input placeholder="+7 (999) 123-45-67" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="ivan@drinks.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </form>
    </Form>
  );
}
