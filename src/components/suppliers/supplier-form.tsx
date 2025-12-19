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
import { Separator } from '@/components/ui/separator';
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

  function onSubmit(data: SupplierFormValues) {
    if (!firestore) return;
    setIsSaving(true);
    
    const supplierRef = supplier ? doc(firestore, 'bars', barId, 'suppliers', supplier.id) : doc(collection(firestore, 'bars', barId, 'suppliers'));
    const supplierData = {
      ...data,
      id: supplierRef.id,
      barId: barId,
    };

    setDoc(supplierRef, supplierData, { merge: true })
      .then(() => {
        toast({ title: supplier ? 'Поставщик обновлен' : 'Поставщик создан' });
        onFormSubmit();
      })
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
            path: supplierRef.path, 
            operation: supplier ? 'update' : 'create',
            requestResourceData: supplierData,
        }));
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
        <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Основная информация
            </h3>
            <div className="space-y-4">
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
            </div>
          </div>
        </div>
        
        <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Контактная информация
            </h3>
            <div className="space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </div>
          </div>
        </div>
        
        <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </form>
    </Form>
  );
}
