'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Product } from '@/lib/types';
import { productCategories, productSubCategories, translateCategory, translateSubCategory } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { useFirestore } from '@/firebase';
import { serverTimestamp, collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formSchema = z.object({
  name: z.string().min(2, 'Название должно содержать не менее 2 символов.'),
  category: z.enum(productCategories),
  subCategory: z.string().optional(),
  imageUrl: z.string().optional(),
  
  costPerBottle: z.coerce.number().positive('Должно быть положительным числом.'),
  sellingPricePerPortion: z.coerce.number().positive('Должно быть положительным числом.'),
  portionVolumeMl: z.coerce.number().positive('Должно быть положительным числом.'),

  bottleVolumeMl: z.coerce.number().positive('Должно быть положительным числом.'),
  bottleHeightCm: z.coerce.number().optional(),
  fullBottleWeightG: z.coerce.number().optional(),
  emptyBottleWeightG: z.coerce.number().optional(),

  isActive: z.boolean(),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
    product?: Product;
    onFormSubmit: () => void;
}

export function ProductForm({ product, onFormSubmit }: ProductFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product ? {
        ...product,
        subCategory: product.subCategory ?? undefined,
        imageUrl: product.imageUrl ?? undefined,
        bottleHeightCm: product.bottleHeightCm ?? undefined,
        fullBottleWeightG: product.fullBottleWeightG ?? undefined,
        emptyBottleWeightG: product.emptyBottleWeightG ?? undefined,
    } : {
      name: '',
      category: 'Other',
      bottleVolumeMl: 700,
      costPerBottle: 0,
      sellingPricePerPortion: 0,
      portionVolumeMl: 40,
      isActive: true,
      imageUrl: PlaceHolderImages.find(p => p.id.toLowerCase() === 'other')?.imageUrl,
    },
  });

  const watchedCategory = form.watch('category');

  React.useEffect(() => {
    if (form.formState.isDirty) {
      const image = PlaceHolderImages.find(p => p.id.toLowerCase() === watchedCategory.toLowerCase());
      if (image) {
        form.setValue('imageUrl', image.imageUrl, { shouldDirty: true });
      }
    }
  }, [watchedCategory, form]);

  function onSubmit(data: ProductFormValues) {
    if (!firestore) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось подключиться к базе данных." });
      return;
    }
    
    const productCollection = collection(firestore, 'products');

    if (product?.id) {
        // Update existing product
        const productRef = doc(productCollection, product.id);
        updateDocumentNonBlocking(productRef, { ...data, updatedAt: serverTimestamp() });
        toast({ title: "Продукт обновлен", description: `Данные о "${data.name}" сохранены.` });

    } else {
        // Create new product
        const newDocRef = doc(productCollection); // Create a new doc ref to get ID
        const newProductData = {
            id: newDocRef.id,
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        setDocumentNonBlocking(newDocRef, newProductData, {});
        toast({ title: "Продукт создан", description: `"${data.name}" добавлен в каталог.` });
    }
    onFormSubmit();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название продукта</FormLabel>
              <FormControl>
                <Input placeholder="Jameson 0.7L" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Категория</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {productCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{translateCategory(cat)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           {(productSubCategories[watchedCategory] && productSubCategories[watchedCategory].length > 0) && (
             <FormField
                control={form.control}
                name="subCategory"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Подкатегория</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Выберите подкатегорию" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {productSubCategories[watchedCategory].map(subCat => (
                          <SelectItem key={subCat} value={subCat}>{translateSubCategory(subCat)}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
           )}
        </div>
        
        <Separator />
        <h3 className="text-lg font-medium">Экономика</h3>

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="portionVolumeMl"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Объем порции (мл)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="sellingPricePerPortion"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Цена за порцию (₽)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
         <FormField
            control={form.control}
            name="costPerBottle"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Стоимость закупки (₽)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

        <Separator />
        <h3 className="text-lg font-medium">Профиль бутылки для калькулятора</h3>
        
        <FormField
        control={form.control}
        name="bottleVolumeMl"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Номинальный объем (мл)</FormLabel>
            <FormControl>
                <Input type="number" {...field} />
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="fullBottleWeightG"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Вес полной (г)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} placeholder="1150"/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="emptyBottleWeightG"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Вес пустой (г)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} placeholder="450"/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="bottleHeightCm"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Высота бутылки (см)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.1" {...field} placeholder="30"/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
       
        <Separator />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Активен
                </FormLabel>
                <FormDescription>
                  Активные продукты доступны для инвентаризаций и калькулятора.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Сохранить продукт</Button>
      </form>
    </Form>
  );
}
