'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { upsertPurchaseOrder } from '@/lib/actions';
import { doc, collection, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const orderStatuses: PurchaseOrderStatus[] = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'];
const statusTranslations: Record<PurchaseOrderStatus, string> = {
    draft: 'Черновик',
    ordered: 'Заказан',
    partially_received: 'Частично получен',
    received: 'Получен',
    cancelled: 'Отменен'
};


const formSchema = z.object({
  supplierId: z.string().min(1, 'Необходимо выбрать поставщика.'),
  orderDate: z.date({ required_error: "Необходимо указать дату заказа." }),
  status: z.enum(orderStatuses),
});

type PurchaseOrderFormValues = z.infer<typeof formSchema>;

interface PurchaseOrderFormProps {
    barId: string;
    order?: PurchaseOrder;
    suppliers: Supplier[];
    onFormSubmit: () => void;
}

export function PurchaseOrderForm({ barId, order, suppliers, onFormSubmit }: PurchaseOrderFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: order ? {
      supplierId: order.supplierId,
      orderDate: order.orderDate.toDate(),
      status: order.status,
    } : {
      supplierId: '',
      orderDate: new Date(),
      status: 'draft',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: PurchaseOrderFormValues) {
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось подключиться к базе данных или определить пользователя." });
      return;
    }
    
    const orderId = order?.id || doc(collection(firestore, 'bars', barId, 'purchaseOrders')).id;
    
    const newOrderData = {
      id: orderId,
      supplierId: data.supplierId,
      orderDate: Timestamp.fromDate(data.orderDate),
      status: data.status,
      createdByUserId: user.uid,
    };

    const result = await upsertPurchaseOrder(barId, newOrderData);

    if (result.success && result.id) {
      toast({
        title: order ? 'Заказ обновлен' : 'Заказ создан',
        description: `Заказ для поставщика был сохранен.`,
      });
      onFormSubmit();
      if (!order) {
        router.push(`/dashboard/purchase-orders/${result.id}`);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: result.error || "Не удалось сохранить заказ.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
        <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Поставщик</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите поставщика" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        <FormField
            control={form.control}
            name="orderDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Дата Заказа</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        >
                        {field.value ? (
                            format(field.value, "PPP", { locale: ru })
                        ) : (
                            <span>Выберите дату</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Статус</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {orderStatuses.map(s => (
                        <SelectItem key={s} value={s}>{statusTranslations[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Сохранение...' : (order ? 'Сохранить изменения' : 'Создать и перейти к заказу')}
        </Button>
      </form>
    </Form>
  );
}
