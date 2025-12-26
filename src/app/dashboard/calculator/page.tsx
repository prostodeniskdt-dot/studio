'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox, type GroupedComboboxOption } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Weight, Send, Loader2, Search, Package, Ruler, Calculator, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { SectionHeader } from '@/components/ui/section-header';
import { HelpIcon } from '@/components/ui/help-icon';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { InventorySession, Product, ProductCategory, InventoryLine } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useProducts } from '@/contexts/products-context';
import { translateCategory, productCategories, productSubCategories, translateSubCategory, dedupeProductsByName, buildProductDisplayName } from '@/lib/utils';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { ProductSearch } from '@/components/products/product-search';
import { expandPremixToIngredients } from '@/lib/premix-utils';
import { Checkbox } from '@/components/ui/checkbox';

export default function UnifiedCalculatorPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;

  // Использовать контекст продуктов вместо прямой загрузки
  const { products, isLoading: isLoadingProducts } = useProducts();

  const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = React.useState<string | undefined>();
  const [selectedProductId, setSelectedProductId] = React.useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = React.useState('');

  const [bottleVolume, setBottleVolume] = React.useState('');
  const [fullWeight, setFullWeight] = React.useState('');
  const [emptyWeight, setEmptyWeight] = React.useState('');
  const [currentWeight, setCurrentWeight] = React.useState('');
  const [liquidLevel, setLiquidLevel] = React.useState('');
  
  const [calculatedVolume, setCalculatedVolume] = React.useState<number | null>(null);
  
  const [isSending, setIsSending] = React.useState(false);
  
  // Состояние для разложения примиксов
  const [shouldExpandPremix, setShouldExpandPremix] = React.useState(false);

  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    
    const uniqueProducts = dedupeProductsByName(products);

    return uniqueProducts.filter(p => {
      const categoryMatch = !selectedCategory || p.category === selectedCategory;
      const subCategoryMatch = !selectedSubCategory || p.subCategory === selectedSubCategory;
      const searchMatch = !searchTerm || buildProductDisplayName(p.name, p.bottleVolumeMl).toLowerCase().includes(searchTerm.toLowerCase());
      return categoryMatch && subCategoryMatch && searchMatch;
    });
  }, [products, selectedCategory, selectedSubCategory, searchTerm]);

  const productOptions = React.useMemo<GroupedComboboxOption[]>(() => {
    if (filteredProducts.length === 0) return [];
    const groups: Record<string, { value: string; label: string }[]> = {};
    
    filteredProducts.forEach(p => {
      const category = translateCategory(p.category);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ value: p.id, label: buildProductDisplayName(p.name, p.bottleVolumeMl) });
    });

    return Object.entries(groups)
      .map(([label, options]) => ({ label, options }))
      .sort((a,b) => a.label.localeCompare(b.label));

  }, [filteredProducts]);

  const handleProductSelect = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    setSelectedProductId(productId);
    setCalculatedVolume(null);
    // Сбрасываем состояние разложения при выборе нового продукта
    setShouldExpandPremix(false);
    if (product) {
        setBottleVolume(product.bottleVolumeMl?.toString() ?? '');
        setFullWeight(product.fullBottleWeightG?.toString() ?? '');
        setEmptyWeight(product.emptyBottleWeightG?.toString() ?? '');
    }
  };
  
  const selectedProduct = React.useMemo(() => {
    return products?.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);
  
  const isPremix = selectedProduct?.isPremix === true;
  
  const handleCategoryChange = (category: ProductCategory | undefined) => {
    setSelectedCategory(category);
    setSelectedSubCategory(undefined);
    setSelectedProductId(undefined);
    resetInputs();
  };

  const handleSubCategoryChange = (subCategory: string | undefined) => {
    setSelectedSubCategory(subCategory);
    setSelectedProductId(undefined);
    resetInputs();
  }

  const resetInputs = () => {
    setBottleVolume('');
    setFullWeight('');
    setEmptyWeight('');
    setCalculatedVolume(null);
  };


  const handleCalculate = () => {
    setCalculatedVolume(null);
    
    const bv = parseFloat(bottleVolume);
    const fw = parseFloat(fullWeight);
    const ew = parseFloat(emptyWeight);
    const cw = parseFloat(currentWeight);
    const ll = parseFloat(liquidLevel);

    // Проверка обязательных полей
    if (!liquidLevel || ll <= 0) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Обязательно заполните уровень жидкости (1 резка = 1 см). Без этого параметра расчет невозможен.",
      });
      return;
    }

    // Получить реальную высоту жидкости из продукта или использовать значение по умолчанию 25см
    const fullLiquidHeightCm = selectedProduct?.fullLiquidHeightCm ?? 25;

    let volumeByWeight: number | null = null;
    let volumeByHeight: number | null = null;

    // Weight calculation - более точный метод
    if (fw > ew && cw >= ew && bv > 0) {
        const liquidNetWeight = fw - ew;
        const currentLiquidWeight = cw - ew;
        if (currentLiquidWeight <= 0) {
            volumeByWeight = 0;
        } else {
            // Точный расчет по весу
            const volume = (currentLiquidWeight / liquidNetWeight) * bv;
            volumeByWeight = volume; // Не округляем пока, округлим в конце
        }
    }
    
    // Height calculation с калибровкой по реальной высоте
    if (ll > 0 && bv > 0 && fullLiquidHeightCm > 0) {
        // Используем реальную высоту жидкости в полной бутылке
        const percentage = Math.min(ll / fullLiquidHeightCm, 1);
        const volume = bv * percentage;
        volumeByHeight = volume; // Не округляем пока
    }

    // Комбинированная формула с весами для максимальной точности
    if (volumeByWeight !== null && volumeByHeight !== null) {
        // Разница между двумя методами
        const difference = Math.abs(volumeByWeight - volumeByHeight);
        const percentageDifference = (difference / bv) * 100;
        
        let finalVolume: number;
        
        // Если разница меньше 5%, используем взвешенное среднее (70% вес, 30% высота)
        // Вес считается более точным, но высота помогает учесть форму бутылки
        if (percentageDifference < 5) {
            finalVolume = volumeByWeight * 0.7 + volumeByHeight * 0.3;
        }
        // Если разница 5-15%, используем среднее (50/50)
        else if (percentageDifference < 15) {
            finalVolume = (volumeByWeight + volumeByHeight) / 2;
        }
        // Если разница большая (>15%), приоритет весу (90% вес, 10% высота)
        else {
            finalVolume = volumeByWeight * 0.9 + volumeByHeight * 0.1;
        }
        
        // Округляем до целого числа
        setCalculatedVolume(Math.round(finalVolume));
    } else if (volumeByWeight !== null) {
        // Если нет высоты, используем только вес
        setCalculatedVolume(Math.round(volumeByWeight));
    } else if (volumeByHeight !== null) {
        // Если нет веса, используем только высоту (не должно происходить при правильной валидации)
        setCalculatedVolume(Math.round(volumeByHeight));
    } else {
        toast({
          variant: "destructive",
          title: "Ошибка расчета",
          description: "Не удалось рассчитать объем. Проверьте все поля (вес полной, пустой, текущий вес и уровень жидкости).",
        });
    }
  };

  const handleSendToInventory = async (volume: number | null) => {
    if (volume === null || !selectedProductId || !barId || !firestore || !selectedProduct) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Сначала рассчитайте объем и выберите продукт.",
      });
      return;
    }

    setIsSending(true);
    
    try {
        const sessionsQuery = query(
            collection(firestore, 'bars', barId, 'inventorySessions'),
            where('status', '==', 'in_progress'),
            limit(1)
        );

        const sessionsSnapshot = await getDocs(sessionsQuery);

        if (sessionsSnapshot.empty) {
            toast({
                variant: "destructive",
                title: "Нет активной инвентаризации",
                description: "Пожалуйста, начните новую инвентаризацию на главной панели.",
            });
            setIsSending(false);
            return;
        }

        const activeSessionDoc = sessionsSnapshot.docs[0];
        const activeSession = activeSessionDoc.data() as InventorySession;
        const activeSessionId = activeSessionDoc.id;
        const linesColRef = collection(firestore, 'bars', barId, 'inventorySessions', activeSessionId, 'lines');
        
        // Если это примикс и включено разложение на ингредиенты
        if (isPremix && shouldExpandPremix && selectedProduct.premixIngredients && selectedProduct.premixIngredients.length > 0) {
          const batch = writeBatch(firestore);
          
          // Разложить примикс на ингредиенты
          const ingredients = expandPremixToIngredients(selectedProduct, volume);
          
          // Для каждого ингредиента найти или создать линию
          for (const ingredient of ingredients) {
            const linesQuery = query(
              linesColRef, 
              where('productId', '==', ingredient.productId), 
              limit(1)
            );
            const linesSnapshot = await getDocs(linesQuery);
            
            if (linesSnapshot.empty) {
              // Создать новую линию
              const newLineRef = doc(linesColRef);
              const newLineData: InventoryLine = {
                id: newLineRef.id,
                productId: ingredient.productId,
                inventorySessionId: activeSessionId,
                startStock: 0,
                purchases: 0,
                sales: 0,
                endStock: ingredient.volumeMl, // Новая линия - установить объем
                theoreticalEndStock: 0,
                differenceVolume: 0,
                differenceMoney: 0,
                differencePercent: 0,
              };
              batch.set(newLineRef, newLineData);
            } else {
              // Обновить существующую линию - СУММИРОВАТЬ с существующим остатком
              const lineDoc = linesSnapshot.docs[0];
              const lineRef = doc(linesColRef, lineDoc.id);
              const existingLine = lineDoc.data() as InventoryLine;
              batch.update(lineRef, { 
                endStock: (existingLine.endStock || 0) + ingredient.volumeMl 
              });
            }
          }
          
          await batch.commit();
          toast({
            title: "Премикс разложен на ингредиенты",
            description: `Создано/обновлено ${ingredients.length} ингредиентов в инвентаризации. Объемы суммированы с существующими остатками.`,
          });
        } else {
          // Обычная логика (как раньше) - создать/обновить одну линию для продукта/примикса
          const linesQuery = query(linesColRef, where('productId', '==', selectedProductId), limit(1));
          const linesSnapshot = await getDocs(linesQuery);

          if (linesSnapshot.empty) {
            const batch = writeBatch(firestore);
            const newLineRef = doc(linesColRef);
            const newLineData: InventoryLine = {
              id: newLineRef.id,
              productId: selectedProductId,
              inventorySessionId: activeSessionId,
              startStock: 0,
              purchases: 0,
              sales: 0,
              endStock: volume,
              theoreticalEndStock: 0,
              differenceVolume: 0,
              differenceMoney: 0,
              differencePercent: 0,
            };
            batch.set(newLineRef, newLineData);
            
            await batch.commit();
            toast({
              title: "Данные отправлены",
              description: `Остаток для продукта ${buildProductDisplayName(selectedProduct.name, selectedProduct.bottleVolumeMl)} (${volume} мл) добавлен в текущую инвентаризацию.`,
            });
          } else {
            const lineDoc = linesSnapshot.docs[0];
            const existingLine = lineDoc.data() as InventoryLine;
            const lineRef = doc(firestore, 'bars', barId, 'inventorySessions', activeSessionId, 'lines', lineDoc.id);
            const existingEndStock = existingLine.endStock || 0;
            const newEndStock = existingEndStock + volume;
            const updateData = { endStock: newEndStock };
            await updateDoc(lineRef, updateData);
            toast({
              title: "Данные отправлены",
              description: `Остаток для продукта ${buildProductDisplayName(selectedProduct.name, selectedProduct.bottleVolumeMl)} (${volume} мл) добавлен к существующему остатку (${existingEndStock} мл). Итого: ${newEndStock} мл.`,
            });
          }
        }
    } catch (serverError: unknown) {
        const errorMessage = serverError instanceof Error ? serverError.message : 'Не удалось отправить данные в инвентаризацию';
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: errorMessage,
        });
        const operation = 'write';
        const permissionError = new FirestorePermissionError({ path: `bars/${barId}/inventorySessions`, operation });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSending(false);
    }
  };

  const [isCalculating, setIsCalculating] = React.useState(false);

  const handleCalculateWithFeedback = () => {
    setIsCalculating(true);
    setTimeout(() => {
      handleCalculate();
      setIsCalculating(false);
    }, 300);
  };

  if (isLoadingProducts) {
      return (
          <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  return (
    <div className="w-full space-y-6">
      <SectionHeader
        title="Универсальный калькулятор"
        description="Рассчитайте остатки в бутылке и отправьте данные в текущую инвентаризацию."
      />
      
      <div className="mb-4 flex items-center gap-2">
        <HelpIcon 
          description="Выберите продукт, введите вес полной бутылки, вес пустой бутылки, текущий вес и уровень жидкости (1 резка = 1 см на мерной ложке). Нажмите 'Рассчитать', затем 'Отправить в инвентаризацию'."
        />
        <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
      </div>

      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>ВАЖНО</AlertTitle>
        <AlertDescription>
          Обязательно заполните вес полной бутылки, вес пустой бутылки, текущий вес И уровень жидкости (1 резка = 1 см). Без всех данных расчет невозможен!
        </AlertDescription>
      </Alert>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Левая колонка: Выбор продукта и параметры */}
        <div className="lg:col-span-2 space-y-6">
          {/* Секция выбора продукта */}
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Выбор продукта</CardTitle>
              </div>
              <CardDescription>Выберите продукт для автозаполнения параметров бутылки</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductSearch
                value={searchTerm}
                onChange={setSearchTerm}
                onCategoryChange={handleCategoryChange}
                onSubCategoryChange={handleSubCategoryChange}
                selectedCategory={selectedCategory}
                selectedSubCategory={selectedSubCategory}
                showFilters={true}
                placeholder="Поиск продуктов..."
                resultsCount={filteredProducts.length}
                isLoading={isLoadingProducts}
              />
              <Combobox 
                options={productOptions}
                value={selectedProductId}
                onSelect={handleProductSelect}
                placeholder="Выберите продукт"
                searchPlaceholder='Поиск продукта...'
                notFoundText='Продукт не найден.'
              />
            </CardContent>
          </Card>

          {/* Секция параметров бутылки */}
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-primary" />
                <CardTitle>Параметры бутылки</CardTitle>
              </div>
              <CardDescription>Введите замеры для расчета объема жидкости</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Расчет по весу */}
              <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-base font-semibold">Расчет по весу</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullWeight" className="flex items-center gap-2">
                      <Weight className="h-3 w-3" />
                      Вес полной (г)
                    </Label>
                    <Input 
                      id="fullWeight" 
                      type="number" 
                      value={fullWeight} 
                      onChange={e => setFullWeight(e.target.value)} 
                      placeholder="1150" 
                      disabled={!selectedProductId}
                      className="transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emptyWeight" className="flex items-center gap-2">
                      <Weight className="h-3 w-3" />
                      Вес пустой (г)
                    </Label>
                    <Input 
                      id="emptyWeight" 
                      type="number" 
                      value={emptyWeight} 
                      onChange={e => setEmptyWeight(e.target.value)} 
                      placeholder="450" 
                      disabled={!selectedProductId}
                      className="transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentWeight" className="flex items-center gap-2">
                    <Weight className="h-3 w-3" />
                    Текущий вес (г)
                  </Label>
                  <Input 
                    id="currentWeight" 
                    type="number" 
                    value={currentWeight} 
                    onChange={e => setCurrentWeight(e.target.value)} 
                    placeholder="Замер с весов" 
                    disabled={!selectedProductId}
                    className="transition-all duration-200"
                  />
                </div>
              </div>

              <Separator />
              
              {/* Расчет по высоте */}
              <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-base font-semibold">Расчет по высоте</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="liquidLevel" className="flex items-center gap-2">
                    <Ruler className="h-3 w-3" />
                    Уровень жидкости (см)
                  </Label>
                  <Input 
                    id="liquidLevel" 
                    type="number" 
                    value={liquidLevel} 
                    onChange={e => setLiquidLevel(e.target.value)} 
                    placeholder="Замер линейкой" 
                    disabled={!selectedProductId}
                    className="transition-all duration-200"
                  />
                </div>
              </div>

              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="bottleVolume" className="flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  Номинальный объем (мл)
                </Label>
                <Input 
                  id="bottleVolume" 
                  type="number" 
                  value={bottleVolume} 
                  onChange={(e) => setBottleVolume(e.target.value)} 
                  placeholder="700" 
                  disabled={!selectedProductId}
                  className="transition-all duration-200"
                />
              </div>

              <Button 
                onClick={handleCalculateWithFeedback} 
                className="w-full h-12 text-lg font-semibold" 
                disabled={!selectedProductId || isCalculating}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Расчет...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-5 w-5" />
                    Рассчитать
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка: Результаты */}
        <div className="lg:col-span-1">
          {calculatedVolume !== null ? (
            <Card className='bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 animate-scale-up sticky top-6'>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <CardTitle>Результат расчета</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 rounded-lg bg-background/80 backdrop-blur-sm border border-primary/20">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mb-2">
                    <Weight className='h-4 w-4'/> 
                    Рассчитанный объем:
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <p className="text-5xl font-bold gradient-text">{calculatedVolume}</p>
                    <span className="text-2xl font-semibold text-muted-foreground">мл</span>
                  </div>
                  
                  {/* Чекбокс для разложения примиксов */}
                  {isPremix && (
                    <>
                      <div className="flex items-center justify-center space-x-2 mt-4 mb-2">
                        <Checkbox
                          id="expandPremix"
                          checked={shouldExpandPremix}
                          onCheckedChange={(checked) => setShouldExpandPremix(checked === true)}
                        />
                        <Label htmlFor="expandPremix" className="text-sm font-normal cursor-pointer">
                          Разложить на ингредиенты
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        {shouldExpandPremix 
                          ? 'Премикс будет разложен на ингредиенты, объемы суммируются с существующими остатками'
                          : 'Премикс будет добавлен как единое целое в инвентаризацию'}
                      </p>
                    </>
                  )}
                  
                  <Button 
                    onClick={() => handleSendToInventory(calculatedVolume)} 
                    className="w-full mt-2 font-semibold" 
                    disabled={calculatedVolume === null || isSending || !barId}
                    size="lg"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Отправить в инвентаризацию
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Calculator className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Результаты расчета</h3>
                <p className="text-sm text-muted-foreground">
                  Введите параметры и нажмите "Рассчитать" для получения результата
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
