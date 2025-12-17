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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Combobox, type GroupedComboboxOption } from '@/components/ui/combobox';
import type { Product, PremixIngredient } from '@/lib/types';
import { buildProductDisplayName, extractVolume } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/contexts/products-context';
import { calculatePremixCost } from '@/lib/premix-utils';
import type { Supplier } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, 'Название должно содержать не менее 2 символов.'),
  category: z.literal('Premix'),
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

type PremixFormValues = z.infer<typeof formSchema>;

interface PremixFormProps {
    premix?: Product;
    onFormSubmit: () => void;
}

export function PremixForm({ premix, onFormSubmit }: PremixFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const barId = user ? `bar_${user.uid}` : null;
  const { toast } = useToast();
  const { globalProducts } = useProducts(); // Используем globalProducts для выбора ингредиентов
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Инициализация ингредиентов с правильным ratio
  const initialIngredients = React.useMemo(() => {
    if (premix?.premixIngredients && premix.bottleVolumeMl > 0) {
      return premix.premixIngredients.map(ing => ({
        ...ing,
        ratio: ing.volumeMl / premix.bottleVolumeMl,
      }));
    }
    return [];
  }, [premix?.id, premix?.premixIngredients, premix?.bottleVolumeMl]);
  
  const [ingredients, setIngredients] = React.useState<PremixIngredient[]>(initialIngredients);
  
  // Синхронизация состояния при изменении premix
  React.useEffect(() => {
    if (premix) {
      // Обновляем ингредиенты только если они изменились
      const newIngredients = premix.premixIngredients && premix.bottleVolumeMl > 0
        ? premix.premixIngredients.map(ing => ({
            ...ing,
            ratio: ing.volumeMl / premix.bottleVolumeMl,
          }))
        : [];
      if (JSON.stringify(newIngredients) !== JSON.stringify(ingredients)) {
        setIngredients(newIngredients);
      }
      if (premix.costCalculationMode && premix.costCalculationMode !== costMode) {
        setCostMode(premix.costCalculationMode);
      }
    }
  }, [premix?.id, premix?.premixIngredients, premix?.bottleVolumeMl, premix?.costCalculationMode]);
  
  const [costMode, setCostMode] = React.useState<'auto' | 'manual'>(
    premix?.costCalculationMode || 'auto'
  );
  
  // Состояния для добавления нового ингредиента
  const [newIngredientProductId, setNewIngredientProductId] = React.useState('');
  const [newIngredientVolume, setNewIngredientVolume] = React.useState<number>(0);

  const suppliersQuery = useMemoFirebase(() => 
    firestore && barId ? collection(firestore, 'bars', barId, 'suppliers') : null,
    [firestore, barId]
  );
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const form = useForm<PremixFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: premix ? {
        ...premix,
        name: buildProductDisplayName(premix.name, premix.bottleVolumeMl), // Show full name for editing
        category: 'Premix',
        subCategory: premix.subCategory ?? undefined,
        imageUrl: premix.imageUrl ?? undefined,
        fullBottleWeightG: premix.fullBottleWeightG ?? undefined,
        emptyBottleWeightG: premix.emptyBottleWeightG ?? undefined,
        reorderPointMl: premix.reorderPointMl ?? undefined,
        reorderQuantity: premix.reorderQuantity ?? undefined,
        defaultSupplierId: premix.defaultSupplierId ?? undefined,
    } : {
      name: '',
      category: 'Premix',
      bottleVolumeMl: 700,
      costPerBottle: 0,
      sellingPricePerPortion: 0,
      portionVolumeMl: 40,
      isActive: true,
      imageUrl: PlaceHolderImages.find(p => p.id.toLowerCase() === 'premix')?.imageUrl || PlaceHolderImages.find(p => p.id.toLowerCase() === 'other')?.imageUrl,
      fullBottleWeightG: undefined,
      emptyBottleWeightG: undefined,
      reorderPointMl: undefined,
      reorderQuantity: undefined,
      defaultSupplierId: undefined,
    },
  });

  const watchedName = form.watch('name');
  const watchedVolume = form.watch('bottleVolumeMl');
  
  const volumeTouchedRef = React.useRef(false);
  
  // Фильтр продуктов для ингредиентов: все глобальные продукты, исключая текущий редактируемый примикс
  // Используем globalProducts для выбора ингредиентов (только глобальные продукты, не примиксы)
  const ingredientProducts = React.useMemo(() => {
    return globalProducts.filter(p => p.id !== premix?.id);
  }, [globalProducts, premix?.id]);
  
  // Группировка продуктов-ингредиентов по категориям для Combobox (как в калькуляторе)
  const ingredientProductOptions = React.useMemo<GroupedComboboxOption[]>(() => {
    if (ingredientProducts.length === 0) return [];
    const groups: Record<string, { value: string; label: string }[]> = {};
    
    ingredientProducts.forEach(p => {
      const category = translateCategory(p.category);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ value: p.id, label: buildProductDisplayName(p.name, p.bottleVolumeMl) });
    });

    return Object.entries(groups)
      .map(([label, options]) => ({ label, options }))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [ingredientProducts]);
  
  // Map для быстрого поиска продуктов по ID
  const productsMap = React.useMemo(() => {
    const map = new Map<string, Product>();
    globalProducts.forEach(p => map.set(p.id, p));
    return map;
  }, [globalProducts]);
  
  // При изменении объема бутылки пересчитывать ratio для всех ингредиентов
  const prevVolumeRef = React.useRef(watchedVolume);
  React.useEffect(() => {
    if (watchedVolume > 0 && ingredients.length > 0 && prevVolumeRef.current !== watchedVolume) {
      prevVolumeRef.current = watchedVolume;
      const updatedIngredients = ingredients.map(ing => ({
        ...ing,
        ratio: ing.volumeMl / watchedVolume,
      }));
      setIngredients(updatedIngredients);
    }
  }, [watchedVolume, ingredients.length]); // Используем только length, чтобы избежать бесконечного цикла
  
  // Расчет стоимости при изменении ингредиентов (если auto mode)
  const prevIngredientsRef = React.useRef<string>(JSON.stringify(ingredients));
  React.useEffect(() => {
    if (costMode === 'auto' && ingredients.length > 0 && watchedVolume > 0 && productsMap.size > 0) {
      const ingredientsStr = JSON.stringify(ingredients);
      if (prevIngredientsRef.current !== ingredientsStr) {
        prevIngredientsRef.current = ingredientsStr;
        
        const premixProduct: Product = {
          ...form.getValues(),
          isPremix: true,
          premixIngredients: ingredients,
          bottleVolumeMl: watchedVolume,
          costPerBottle: 0, // Временное значение для расчета
        } as Product;
        
        const calculatedCost = calculatePremixCost(premixProduct, productsMap);
        form.setValue('costPerBottle', calculatedCost, { shouldDirty: true });
      }
    }
  }, [ingredients, costMode, watchedVolume, productsMap.size, form]);

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
  
  // Функции для управления ингредиентами
  const handleAddIngredient = () => {
    if (!newIngredientProductId || newIngredientVolume <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите продукт и укажите объем',
        variant: 'destructive',
      });
      return;
    }
    
    const currentTotalVolume = ingredients.reduce((sum, ing) => sum + ing.volumeMl, 0);
    if (currentTotalVolume + newIngredientVolume > watchedVolume) {
      toast({
        title: 'Ошибка',
        description: `Сумма объемов ингредиентов (${currentTotalVolume + newIngredientVolume} мл) превышает объем бутылки (${watchedVolume} мл)`,
        variant: 'destructive',
      });
      return;
    }
    
    // Проверка на дубликаты
    if (ingredients.some(ing => ing.productId === newIngredientProductId)) {
      toast({
        title: 'Ошибка',
        description: 'Этот ингредиент уже добавлен',
        variant: 'destructive',
      });
      return;
    }
    
    const ratio = watchedVolume > 0 ? newIngredientVolume / watchedVolume : 0;
    const newIngredient: PremixIngredient = {
      productId: newIngredientProductId,
      volumeMl: newIngredientVolume,
      ratio,
    };
    
    setIngredients([...ingredients, newIngredient]);
    setNewIngredientProductId('');
    setNewIngredientVolume(0);
  };
  
  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };
  
  const totalIngredientsVolume = React.useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + ing.volumeMl, 0);
  }, [ingredients]);

  function onSubmit(data: PremixFormValues) {
    if (!firestore || !barId) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось определить пользователя',
        variant: 'destructive',
      });
      return;
    }
    
    // Валидация для примиксов - обязательны ингредиенты
    if (ingredients.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Примикс должен содержать хотя бы один ингредиент',
        variant: 'destructive',
      });
      return;
    }
    
    if (totalIngredientsVolume > data.bottleVolumeMl) {
      toast({
        title: 'Ошибка',
        description: `Сумма объемов ингредиентов (${totalIngredientsVolume} мл) превышает объем бутылки (${data.bottleVolumeMl} мл)`,
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    // Всегда используем коллекцию bars/{barId}/premixes для примиксов
    const collectionPath = collection(firestore, 'bars', barId, 'premixes');
    const premixRef = premix 
      ? doc(collectionPath, premix.id) 
      : doc(collectionPath);
    
    // Use the base name for saving, volume is a separate field.
    const { baseName } = extractVolume(data.name);

    // Перед сохранением пересчитать ratio для всех ингредиентов примикса
    // Это гарантирует корректность данных даже если пользователь изменил volume
    let finalIngredients = ingredients;
    if (data.bottleVolumeMl > 0 && ingredients.length > 0) {
      finalIngredients = ingredients.map(ing => ({
        ...ing,
        ratio: ing.volumeMl / data.bottleVolumeMl,
      }));
    }

    const premixData: any = {
        ...data,
        name: baseName, // Save the base name only
        category: 'Premix', // Всегда Premix
        isPremix: true, // Всегда true
        premixIngredients: finalIngredients,
        costCalculationMode: costMode,
        barId: barId, // Всегда устанавливаем barId
        defaultSupplierId: data.defaultSupplierId || null,
        reorderPointMl: data.reorderPointMl || null,
        reorderQuantity: data.reorderQuantity || null,
        fullBottleWeightG: data.fullBottleWeightG || null,
        emptyBottleWeightG: data.emptyBottleWeightG || null,
        id: premixRef.id,
        updatedAt: serverTimestamp(),
        createdAt: premix?.createdAt || serverTimestamp(),
    };

    const pathPrefix = `bars/${barId}/premixes`;
    setDoc(premixRef, premixData, { merge: true })
      .then(() => {
        toast({ title: premix ? "Примикс обновлен" : "Примикс создан" });
        onFormSubmit();
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
            path: `${pathPrefix}/${premixRef.id}`, 
            operation: premix ? 'update' : 'create',
            requestResourceData: premixData
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
              <FormLabel>Название примикса (оригинал)</FormLabel>
              <FormControl>
                <Input placeholder="Коктейль Манхэттен" {...field} />
              </FormControl>
              <FormDescription>Отображаемое имя: {finalDisplayName}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Секция управления ингредиентами (обязательна) */}
        <Separator />
        <h3 className="text-lg font-medium">Ингредиенты примикса</h3>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Combobox
                options={ingredientProductOptions}
                value={newIngredientProductId}
                onSelect={setNewIngredientProductId}
                placeholder="Выберите продукт-ингредиент"
                searchPlaceholder="Поиск продукта..."
                notFoundText="Продукт не найден."
              />
            </div>
            <Input
              type="number"
              placeholder="Объем (мл)"
              value={newIngredientVolume || ''}
              onChange={(e) => setNewIngredientVolume(Number(e.target.value))}
              className="w-32"
            />
            <Button
              type="button"
              onClick={handleAddIngredient}
              disabled={!newIngredientProductId || !newIngredientVolume || newIngredientVolume <= 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </div>
          
          {ingredients.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Добавленные ингредиенты:</div>
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => {
                  const product = productsMap.get(ingredient.productId);
                  return (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex-1">
                        <div className="font-medium">
                          {product ? buildProductDisplayName(product.name, product.bottleVolumeMl) : ingredient.productId}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {ingredient.volumeMl} мл ({(ingredient.ratio * 100).toFixed(1)}%)
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveIngredient(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="text-sm text-muted-foreground">
                Всего объем: {totalIngredientsVolume} мл / {watchedVolume} мл
                {totalIngredientsVolume > watchedVolume && (
                  <span className="text-red-500 ml-2">Превышен объем бутылки!</span>
                )}
              </div>
            </div>
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
        
        {/* Режим расчета стоимости */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Режим расчета стоимости</Label>
            <RadioGroup value={costMode} onValueChange={(value: 'auto' | 'manual') => setCostMode(value)} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="cost-auto" />
                <Label htmlFor="cost-auto" className="font-normal cursor-pointer">
                  Автоматически (сумма ингредиентов)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="cost-manual" />
                <Label htmlFor="cost-manual" className="font-normal cursor-pointer">
                  Установить вручную
                </Label>
              </div>
            </RadioGroup>
          </div>
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
                      readOnly={costMode === 'auto'}
                      disabled={costMode === 'auto'}
                    />
                </FormControl>
                {costMode === 'auto' && (
                  <FormDescription>Стоимость рассчитывается автоматически на основе суммы ингредиентов</FormDescription>
                )}
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
        
        <Separator />
        <h3 className="text-lg font-medium">Параметры автозаказа</h3>
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
                  Активные примиксы доступны для инвентаризаций и калькулятора.
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
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {premix ? 'Сохранить изменения' : 'Создать примикс'}
        </Button>
      </form>
    </Form>
  );
}

