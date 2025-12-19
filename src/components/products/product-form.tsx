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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { Product, Supplier } from '@/lib/types';
import { productCategories, productSubCategories, translateCategory, translateSubCategory, buildProductDisplayName, extractVolume } from '@/lib/utils';
import { productCategorySchema } from '@/lib/schemas/product.schema';
import { Separator } from '../ui/separator';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, 'Название должно содержать не менее 2 символов.'),
  category: productCategorySchema,
  subCategory: z.string().optional(),
  imageUrl: z.string().optional(),
  
  costPerBottle: z.coerce.number().positive('Должно быть положительным числом.'),
  sellingPricePerPortion: z.coerce.number().positive('Должно быть положительным числом.'),
  portionVolumeMl: z.coerce.number().positive('Должно быть положительным числом.'),

  bottleVolumeMl: z.coerce.number().positive('Должно быть положительным числом.'),
  fullBottleWeightG: z.coerce.number().optional(),
  emptyBottleWeightG: z.coerce.number().optional(),

  reorderPointMl: z.coerce.number().optional(),
  reorderQuantity: z.coerce.number().optional(),
  defaultSupplierId: z.string().optional(),

  isActive: z.boolean(),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
    product?: Product;
    onFormSubmit: () => void;
}

export function ProductForm({ product, onFormSubmit }: ProductFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const barId = user ? `bar_${user.uid}` : null;
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const suppliersQuery = useMemoFirebase(() => 
    firestore && barId ? collection(firestore, 'bars', barId, 'suppliers') : null,
    [firestore, barId]
  );
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product ? {
        ...product,
        name: buildProductDisplayName(product.name, product.bottleVolumeMl), // Show full name for editing
        subCategory: product.subCategory ?? undefined,
        imageUrl: product.imageUrl ?? undefined,
        fullBottleWeightG: product.fullBottleWeightG ?? undefined,
        emptyBottleWeightG: product.emptyBottleWeightG ?? undefined,
        reorderPointMl: product.reorderPointMl ?? undefined,
        reorderQuantity: product.reorderQuantity ?? undefined,
        defaultSupplierId: product.defaultSupplierId ?? undefined,
    } : {
      name: '',
      category: 'Other',
      bottleVolumeMl: 700,
      costPerBottle: 0,
      sellingPricePerPortion: 0,
      portionVolumeMl: 40,
      isActive: true,
      imageUrl: PlaceHolderImages.find(p => p.id.toLowerCase() === 'other')?.imageUrl,
      fullBottleWeightG: undefined,
      emptyBottleWeightG: undefined,
      reorderPointMl: undefined,
      reorderQuantity: undefined,
      defaultSupplierId: undefined,
    },
  });

  const watchedCategory = form.watch('category');
  const watchedName = form.watch('name');
  const watchedVolume = form.watch('bottleVolumeMl');
  const watchedCostPerBottle = form.watch('costPerBottle');
  
  const volumeTouchedRef = React.useRef(false);

  React.useEffect(() => {
    if (form.formState.isDirty) {
      const image = PlaceHolderImages.find(p => p.id.toLowerCase() === watchedCategory.toLowerCase());
      if (image) {
        form.setValue('imageUrl', image.imageUrl, { shouldDirty: true });
      }
    }
  }, [watchedCategory, form]);

  React.useEffect(() => {
    const { baseName, volumeMl } = extractVolume(watchedName ?? "");
    if (!volumeMl) return;
  
    // Если пользователь НЕ трогал объём руками — синхронизируем
    if (!volumeTouchedRef.current) {
      form.setValue("bottleVolumeMl", volumeMl, { shouldDirty: true });
    }
  
    // Опционально: очистить name от объёма сразу, чтобы не было "500 мл" в поле
    if (baseName !== (watchedName ?? "").trim()) {
      form.setValue("name", baseName, { shouldDirty: true });
    }
  }, [watchedName, form]);

  function onSubmit(data: ProductFormValues) {
    if (!firestore || !barId) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось определить пользователя',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    // Всегда используем коллекцию products для обычных продуктов
    const collectionPath = collection(firestore, 'products');
    
    const productRef = product 
      ? doc(collectionPath, product.id) 
      : doc(collectionPath);
    
    // Use the base name for saving, volume is a separate field.
    const { baseName } = extractVolume(data.name);

    const productData: any = {
        ...data,
        name: baseName, // Save the base name only
        defaultSupplierId: data.defaultSupplierId || null,
        reorderPointMl: data.reorderPointMl || null,
        reorderQuantity: data.reorderQuantity || null,
        fullBottleWeightG: data.fullBottleWeightG || null,
        emptyBottleWeightG: data.emptyBottleWeightG || null,
        id: productRef.id,
        updatedAt: serverTimestamp(),
        createdAt: product?.createdAt || serverTimestamp(),
    };

    const pathPrefix = 'products';
    setDoc(productRef, productData, { merge: true })
      .then(() => {
        toast({ title: product ? "Продукт обновлен" : "Продукт создан" });
        onFormSubmit();
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
            path: `${pathPrefix}/${productRef.id}`, 
            operation: product ? 'update' : 'create',
            requestResourceData: productData
        }));
      })
      .finally(() => {
        setIsSaving(false);
      });
  }
  
  const finalDisplayName = React.useMemo(() => {
    return buildProductDisplayName(watchedName, watchedVolume);
  }, [watchedName, watchedVolume])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название продукта (оригинал)</FormLabel>
              <FormControl>
                <Input placeholder="Jameson" {...field} />
              </FormControl>
              <FormDescription>Отображаемое имя: {finalDisplayName}</FormDescription>
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
                    {productCategories.filter(cat => cat !== 'Premix').map(cat => (
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
        
        <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Экономика</h3>

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="portionVolumeMl"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="font-medium">Объем порции (мл)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} className="text-left" />
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
                <FormLabel className="font-medium">Цена за порцию (₽)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" {...field} className="text-left" />
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
                <FormLabel className="font-medium">Стоимость закупки (₽)</FormLabel>
                <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field} 
                      className="text-left" 
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        </div>

        <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Профиль бутылки для калькулятора</h3>
        
        <FormField
        control={form.control}
        name="bottleVolumeMl"
        render={({ field }) => (
            <FormItem>
            <FormLabel className="font-medium">Номинальный объем (мл)</FormLabel>
            <FormControl>
                <Input type="number" {...field} onChange={(e) => {
                    volumeTouchedRef.current = true;
                    field.onChange(e);
                }} className="text-left"/>
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
                <FormLabel className="font-medium">Вес полной (г)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} value={field.value ?? ''} placeholder="1150" className="text-left"/>
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
                <FormLabel className="font-medium">Вес пустой (г)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} value={field.value ?? ''} placeholder="450" className="text-left"/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        </div>
        
        <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Параметры автозаказа</h3>
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="reorderPointMl"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="font-medium">Минимальный остаток (мл)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} value={field.value ?? ''} placeholder="Например, 350" className="text-left"/>
                        </FormControl>
                        <FormDescription className="text-sm text-muted-foreground">Когда остаток упадет ниже этого значения, товар попадет в автозаказ.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="reorderQuantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="font-medium">Количество для заказа (бут.)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} value={field.value ?? ''} placeholder="Например, 6" className="text-left"/>
                        </FormControl>
                        <FormDescription className="text-sm text-muted-foreground">Сколько бутылок заказывать, когда остаток низкий.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
                control={form.control}
                name="defaultSupplierId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Поставщик по умолчанию</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                        <SelectTrigger disabled={isLoadingSuppliers}>
                        <SelectValue placeholder={isLoadingSuppliers ? "Загрузка..." : "Выберите поставщика"} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {suppliers ? suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        )) : <SelectItem value="loading" disabled>Загрузка...</SelectItem>}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        </div>
       
        <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
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
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить продукт
        </Button>
      </form>
    </Form>
  );
}
