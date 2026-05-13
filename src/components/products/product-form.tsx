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
import type { Product, Supplier } from '@/lib/types';
import {
  productCategories,
  productSubCategories,
  translateCategory,
  translateSubCategory,
  buildProductDisplayName,
  extractVolume,
} from '@/lib/utils';
import { checkProductDuplicate } from '@/lib/product-duplicate-check';
import { useProducts } from '@/contexts/products-context';
import { productCategorySchema } from '@/lib/schemas/product.schema';
import { Separator } from '../ui/separator';
import { useAuthSession, getWorkingBarId } from '@/contexts/auth-context';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSuppliers } from '@/contexts/suppliers-context';

const formSchema = z.object({
  name: z.string().min(2, 'Название должно содержать не менее 2 символов.'),
  category: productCategorySchema,
  subCategory: z.string().optional(),
  imageUrl: z.string().optional(),

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
  const { user } = useAuthSession();
  const barId = getWorkingBarId(user);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const { globalProducts, upsertProduct } = useProducts();
  const [createInLibrary, setCreateInLibrary] = React.useState(false);
  const { suppliers, isLoading: isLoadingSuppliers } = useSuppliers();

  const suppliersList: Supplier[] = suppliers ?? [];

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product
      ? {
          ...product,
          name: buildProductDisplayName(product.name, product.bottleVolumeMl),
          subCategory: product.subCategory ?? undefined,
          imageUrl: product.imageUrl ?? undefined,
          fullBottleWeightG: product.fullBottleWeightG ?? undefined,
          emptyBottleWeightG: product.emptyBottleWeightG ?? undefined,
          reorderPointMl: product.reorderPointMl ?? undefined,
          reorderQuantity: product.reorderQuantity ?? undefined,
          defaultSupplierId: product.defaultSupplierId ?? undefined,
        }
      : {
          name: '',
          category: 'Other',
          bottleVolumeMl: 700,
          isActive: true,
          imageUrl: PlaceHolderImages.find((p) => p.id.toLowerCase() === 'other')?.imageUrl,
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

  const volumeTouchedRef = React.useRef(false);

  React.useEffect(() => {
    if (form.formState.isDirty) {
      const image = PlaceHolderImages.find((p) => p.id.toLowerCase() === watchedCategory.toLowerCase());
      if (image) {
        form.setValue('imageUrl', image.imageUrl, { shouldDirty: true });
      }
    }
  }, [watchedCategory, form]);

  React.useEffect(() => {
    const { baseName, volumeMl } = extractVolume(watchedName ?? '');
    if (!volumeMl) return;

    if (!volumeTouchedRef.current) {
      form.setValue('bottleVolumeMl', volumeMl, { shouldDirty: true });
    }

    if (baseName !== (watchedName ?? '').trim()) {
      form.setValue('name', baseName, { shouldDirty: true });
    }
  }, [watchedName, form]);

  function onSubmit(data: ProductFormValues) {
    if (!barId || !user) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось определить пользователя',
        variant: 'destructive',
      });
      return;
    }

    if (!product && globalProducts) {
      const { baseName } = extractVolume(data.name);
      const duplicate = checkProductDuplicate(baseName, globalProducts, 85, data.bottleVolumeMl);

      if (duplicate) {
        const duplicateDisplayName = buildProductDisplayName(duplicate.name, duplicate.bottleVolumeMl);
        const newDisplayName = buildProductDisplayName(data.name, data.bottleVolumeMl);
        toast({
          title: 'Продукт уже существует',
          description: `Продукт "${duplicateDisplayName}" уже существует в базе и похож на "${newDisplayName}". Если это разные продукты, убедитесь, что названия существенно отличаются. Если это тот же продукт, используйте существующий.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);

    const { baseName } = extractVolume(data.name);
    const shouldCreateInLibrary = !product && createInLibrary;

    const productData: any = {
      ...data,
      name: baseName,
      defaultSupplierId: data.defaultSupplierId || null,
      reorderPointMl: data.reorderPointMl || null,
      reorderQuantity: data.reorderQuantity || null,
      fullBottleWeightG: data.fullBottleWeightG || null,
      emptyBottleWeightG: data.emptyBottleWeightG || null,
      isInLibrary: product ? product.isInLibrary : shouldCreateInLibrary,
      createdByUserId: product ? product.createdByUserId : user?.id || undefined,
    };

    // Модель данных: библиотека и персональные взаимоисключающие.
    // Если продукт в библиотеке, `barId` не должен быть установлен.
    if (product) {
      productData.barId = product.barId;
    } else if (!shouldCreateInLibrary) {
      productData.barId = barId || undefined;
    }

    (async () => {
      try {
        if (product) {
          const res = await fetch(`/api/products/${product.id}`, {
            method: 'PATCH',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({ product: productData }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error || 'Failed to update product');
          if (json?.product) upsertProduct(json.product as Product);
        } else {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({ product: productData }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error || 'Failed to create product');
          if (json?.product) upsertProduct(json.product as Product);
        }

        if (typeof window !== 'undefined' && barId) {
          try {
            localStorage.removeItem(`barboss_products_cache_${barId}`);
          } catch {
            // ignore
          }
        }

        toast({
          title: product ? 'Продукт обновлен' : shouldCreateInLibrary ? 'Продукт создан в библиотеке' : 'Продукт создан',
          description: product
            ? 'Изменения сохранены успешно'
            : shouldCreateInLibrary
              ? 'Продукт доступен всем пользователям'
              : 'Новый продукт добавлен в вашу базу',
        });

        setTimeout(() => {
          onFormSubmit();
        }, 100);
      } catch (serverError) {
        toast({
          title: 'Ошибка сохранения',
          description:
            serverError instanceof Error
              ? serverError.message
              : 'Не удалось сохранить продукт. Проверьте права доступа и подключение к интернету.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    })();
  }

  const finalDisplayName = React.useMemo(() => buildProductDisplayName(watchedName, watchedVolume), [watchedName, watchedVolume]);

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
                    {productCategories
                      .filter((cat) => cat !== 'Premix')
                      .map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {translateCategory(cat)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {productSubCategories[watchedCategory] && productSubCategories[watchedCategory].length > 0 && (
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
                      {productSubCategories[watchedCategory].map((subCat) => (
                        <SelectItem key={subCat} value={subCat}>
                          {translateSubCategory(subCat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Внимание!</AlertTitle>
          <AlertDescription>ВАЖНО: Обязательно заполните вес полной и пустой бутылки, иначе расчеты будут некорректными!</AlertDescription>
        </Alert>

        <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Профиль бутылки для калькулятора</h3>

          <FormField
            control={form.control}
            name="bottleVolumeMl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Номинальный объем (мл)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      volumeTouchedRef.current = true;
                      field.onChange(e);
                    }}
                    className="text-left"
                  />
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
                    <Input type="number" {...field} value={field.value ?? ''} placeholder="1150" className="text-left" />
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
                    <Input type="number" {...field} value={field.value ?? ''} placeholder="450" className="text-left" />
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
                      <Input type="number" {...field} value={field.value ?? ''} placeholder="Например, 350" className="text-left" />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
                      Когда остаток упадет ниже этого значения, товар попадет в автозаказ.
                    </FormDescription>
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
                      <Input type="number" {...field} value={field.value ?? ''} placeholder="Например, 6" className="text-left" />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
                      Сколько бутылок заказывать, когда остаток низкий.
                    </FormDescription>
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
                        <SelectValue placeholder={isLoadingSuppliers ? 'Загрузка...' : 'Выберите поставщика'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliersList.length > 0 ? (
                        suppliersList.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>
                          Загрузка...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {!product && (
          <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Добавить в общую библиотеку</FormLabel>
                <FormDescription>Продукт будет доступен всем пользователям в библиотеке.</FormDescription>
              </div>
              <Switch checked={createInLibrary} onCheckedChange={setCreateInLibrary} />
            </div>
          </div>
        )}

        <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Активен</FormLabel>
                  <FormDescription>Активные продукты доступны для инвентаризаций и калькулятора.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
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

