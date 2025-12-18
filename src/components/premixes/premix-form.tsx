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
import type { Product, PremixIngredient } from '@/lib/types';
import { buildProductDisplayName, extractVolume, translateCategory, productCategories } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, X, Plus, Search, Check, ChevronDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/contexts/products-context';
import { calculatePremixCost } from '@/lib/premix-utils';

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
  const { globalProducts, isLoading: isLoadingProducts, refresh } = useProducts(); // Используем globalProducts для выбора ингредиентов
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
  
  // Состояния для выбора продукта из таблицы
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedProductId, setSelectedProductId] = React.useState<string>('');
  const [newIngredientVolume, setNewIngredientVolume] = React.useState<number>(0);

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
    },
  });

  const watchedName = form.watch('name');
  const watchedVolume = form.watch('bottleVolumeMl');
  
  const volumeTouchedRef = React.useRef(false);
  
  // Map для быстрого поиска продуктов по ID
  const globalProductsLength = globalProducts?.length ?? 0;
  const productsMap = React.useMemo(() => {
    const map = new Map<string, Product>();
    if (!globalProducts || globalProducts.length === 0) return map;
    globalProducts.forEach(p => map.set(p.id, p));
    return map;
  }, [globalProducts, globalProductsLength]);
  
  // Фильтрация продуктов для выбора в таблице
  const availableProducts = React.useMemo(() => {
    if (!globalProducts || globalProducts.length === 0) return [];
    
    // Исключаем текущий редактируемый примикс
    let filtered = globalProducts.filter(p => p.id !== premix?.id);
    
    // Фильтр по категории
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Фильтр по поиску
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        buildProductDisplayName(p.name, p.bottleVolumeMl).toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query)
      );
    }
    
    // Сортировка по названию
    return filtered.sort((a, b) => 
      buildProductDisplayName(a.name, a.bottleVolumeMl).localeCompare(
        buildProductDisplayName(b.name, b.bottleVolumeMl)
      )
    );
  }, [globalProducts, selectedCategory, searchTerm, premix?.id]);
  
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
  
  // Обработка выбора продукта из таблицы
  const handleProductClick = React.useCallback((productId: string) => {
    // Проверяем, что продукт не добавлен уже
    if (ingredients.some(ing => ing.productId === productId)) {
      toast({
        title: 'Внимание',
        description: 'Этот продукт уже добавлен в состав примикса',
        variant: 'default',
      });
      return;
    }
    
    setSelectedProductId(productId);
  }, [ingredients, toast]);
  
  // Функции для управления ингредиентами
  const handleAddIngredient = () => {
    if (!selectedProductId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите продукт из таблицы',
        variant: 'destructive',
      });
      return;
    }
    
    if (newIngredientVolume <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Укажите объем больше нуля',
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
    if (ingredients.some(ing => ing.productId === selectedProductId)) {
      toast({
        title: 'Ошибка',
        description: 'Этот ингредиент уже добавлен',
        variant: 'destructive',
      });
      return;
    }
    
    const ratio = watchedVolume > 0 ? newIngredientVolume / watchedVolume : 0;
    const newIngredient: PremixIngredient = {
      productId: selectedProductId,
      volumeMl: newIngredientVolume,
      ratio,
    };
    
    setIngredients([...ingredients, newIngredient]);
    
    // Сброс выбора и полей
    setSelectedProductId('');
    setNewIngredientVolume(0);
    setSearchTerm(''); // Очищаем поиск для удобства
    
    toast({
      title: 'Ингредиент добавлен',
      description: `Добавлен ${buildProductDisplayName(productsMap.get(selectedProductId)?.name || '', productsMap.get(selectedProductId)?.bottleVolumeMl || 0)}`,
    });
  };
  
  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };
  
  const totalIngredientsVolume = React.useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + ing.volumeMl, 0);
  }, [ingredients]);

  async function onSubmit(data: PremixFormValues) {
    // Детальное логирование для диагностики
    console.log('=== PREMIX CREATION DEBUG ===');
    console.log('1. User:', {
      uid: user?.uid,
      email: user?.email,
      exists: !!user
    });
    console.log('2. barId:', barId);
    console.log('3. Expected barId format:', user ? `bar_${user.uid}` : 'N/A');
    console.log('4. barId matches expected:', barId === (user ? `bar_${user.uid}` : null));
    console.log('5. Firestore instance:', {
      exists: !!firestore,
      app: firestore?.app?.name
    });
    
    if (!firestore || !barId || !user) {
      console.error('Missing required data:', { firestore: !!firestore, barId, user: !!user });
      toast({
        title: 'Ошибка',
        description: 'Не удалось определить пользователя',
        variant: 'destructive',
      });
      return;
    }
    
    // Проверка существования документа бара
    try {
      const barDocRef = doc(firestore, 'bars', barId);
      const barDocSnap = await getDoc(barDocRef);
      console.log('6. Bar document exists:', barDocSnap.exists());
      console.log('7. Bar document data:', barDocSnap.data());
      
      if (!barDocSnap.exists()) {
        console.warn('8. Bar document does not exist! Creating...');
        try {
          await setDoc(barDocRef, {
            id: barId,
            ownerUserId: user.uid,
            createdAt: serverTimestamp(),
          });
          console.log('9. Bar document created successfully');
        } catch (barCreateError: any) {
          console.error('10. Error creating bar document:', barCreateError);
          toast({
            title: 'Ошибка',
            description: `Не удалось создать документ бара: ${barCreateError?.message || 'Неизвестная ошибка'}`,
            variant: 'destructive',
          });
          return;
        }
      }
    } catch (barCheckError: any) {
      console.error('11. Error checking bar document:', barCheckError);
      // Продолжаем выполнение, так как это может быть ошибка прав доступа
      // которая будет обработана при попытке создания примикса
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
    
    console.log('12. Validation passed, preparing to save...');
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
        fullBottleWeightG: data.fullBottleWeightG || null,
        emptyBottleWeightG: data.emptyBottleWeightG || null,
        id: premixRef.id,
        updatedAt: serverTimestamp(),
        createdAt: premix?.createdAt || serverTimestamp(),
    };

    const pathPrefix = `bars/${barId}/premixes`;
    console.log('13. Collection path:', `bars/${barId}/premixes`);
    console.log('14. Premix data barId field:', premixData.barId);
    console.log('15. barId in data matches path barId:', premixData.barId === barId);
    console.log('16. Premix data keys:', Object.keys(premixData));
    console.log('17. Saving premix data:', { 
      premixData, 
      path: `${pathPrefix}/${premixRef.id}`,
      premixRefId: premixRef.id
    });
    console.log('===========================');
    
    setDoc(premixRef, premixData, { merge: true })
      .then(() => {
        console.log('Premix saved successfully:', premixRef.id);
        toast({ 
          title: premix ? "Примикс обновлен" : "Примикс создан",
          description: `Примикс "${buildProductDisplayName(baseName, data.bottleVolumeMl)}" успешно сохранен.`
        });
        // Обновить контекст продуктов
        refresh();
        // Небольшая задержка перед закрытием диалога, чтобы дать время обновиться данным
        setTimeout(() => {
          onFormSubmit();
        }, 100);
      })
      .catch((serverError: any) => {
        console.error('=== PREMIX SAVE ERROR ===');
        console.error('Error code:', serverError?.code);
        console.error('Error message:', serverError?.message);
        console.error('Error details:', {
          path: `${pathPrefix}/${premixRef.id}`,
          barId,
          userUid: user?.uid,
          barIdMatches: barId === (user ? `bar_${user.uid}` : null),
          premixDataBarId: premixData.barId,
          operation: premix ? 'update' : 'create'
        });
        console.error('Full error object:', serverError);
        console.error('========================');
        
        const errorMessage = serverError?.message || 'Неизвестная ошибка';
        const errorCode = serverError?.code || 'unknown';
        
        toast({
          title: 'Ошибка сохранения',
          description: `Не удалось сохранить примикс: ${errorMessage} (код: ${errorCode})`,
          variant: 'destructive',
        });
        
        if (serverError?.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ 
              path: `${pathPrefix}/${premixRef.id}`, 
              operation: premix ? 'update' : 'create',
              requestResourceData: premixData
          }));
        }
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
          {/* Панель поиска и фильтров */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск продукта..."
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {productCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {translateCategory(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Таблица продуктов */}
          {isLoadingProducts ? (
            <div className="flex items-center justify-center h-48 border rounded-md">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="text-center py-8 border rounded-md">
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Продукты не найдены. Попробуйте изменить фильтры.' 
                  : 'Нет доступных продуктов для выбора'}
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead className="text-right">Объем</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableProducts.map((product) => {
                      const isSelected = selectedProductId === product.id;
                      const isAlreadyAdded = ingredients.some(ing => ing.productId === product.id);
                      
                      return (
                        <TableRow
                          key={product.id}
                          onClick={() => !isAlreadyAdded && handleProductClick(product.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-primary/10 hover:bg-primary/15' 
                              : isAlreadyAdded
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <TableCell>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                            {isAlreadyAdded && !isSelected && (
                              <Badge variant="secondary" className="text-xs">Добавлен</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {buildProductDisplayName(product.name, product.bottleVolumeMl)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {translateCategory(product.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.bottleVolumeMl} мл
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Форма добавления ингредиента (показывается при выборе продукта) */}
          {selectedProductId && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Выбранный продукт:</p>
                  <p className="text-sm text-muted-foreground">
                    {buildProductDisplayName(
                      productsMap.get(selectedProductId)?.name || '',
                      productsMap.get(selectedProductId)?.bottleVolumeMl || 0
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProductId('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Объем ингредиента (мл)"
                  value={newIngredientVolume || ''}
                  onChange={(e) => setNewIngredientVolume(Number(e.target.value))}
                  className="flex-1"
                  min="0"
                  step="1"
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={handleAddIngredient}
                  disabled={!newIngredientVolume || newIngredientVolume <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
            </div>
          )}

          {/* Список добавленных ингредиентов */}
          {ingredients.length > 0 && (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
                <div className="text-sm font-medium">Добавленные ингредиенты ({ingredients.length})</div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="space-y-2">
                  {ingredients.map((ingredient, index) => {
                    const product = productsMap.get(ingredient.productId);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-card">
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
              </CollapsibleContent>
            </Collapsible>
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

