'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox, type GroupedComboboxOption } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Weight, Send, Loader2, Search, Package, Ruler, Calculator, CheckCircle2, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { SectionHeader } from '@/components/ui/section-header';
import { HelpIcon } from '@/components/ui/help-icon';
import type { InventorySession, Product, ProductCategory, InventoryLine } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuthSession, getWorkingBarId, canMutateWorkspace } from '@/contexts/auth-context';
import { useProducts } from '@/contexts/products-context';
import { translateCategory, productCategories, productSubCategories, translateSubCategory, dedupeProductsByName, buildProductDisplayName } from '@/lib/utils';
import { ProductSearch } from '@/components/products/product-search';
import { expandPremixToIngredients } from '@/lib/premix-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { calculateVolumeMl, formatVolumeMlForDisplay } from '@/lib/calculator';
import { patchInventorySessionInLineChunks } from '@/lib/sessions/chunked-patch';
import { pickLatestInProgressSession } from '@/lib/sessions/pick-latest-active';

export default function UnifiedCalculatorPage() {
  const { toast } = useToast();
  const { user } = useAuthSession();
  const barId = getWorkingBarId(user);
  const allowMutate = canMutateWorkspace(user);

  // Использовать контекст продуктов вместо прямой загрузки
  const { products, isLoading: isLoadingProducts } = useProducts();

  React.useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7501/ingest/9bee7bc9-09c8-4378-897e-ea159885b11d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7a9b'},body:JSON.stringify({sessionId:'6e7a9b',location:'calculator/page.tsx:productsState',message:'calculator sees products loading state',data:{isLoadingProducts,productsLen:products?.length ?? -1,userPresent: Boolean(user?.id)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
  }, [isLoadingProducts, products, user?.id]);

  const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = React.useState<string | undefined>();
  const [selectedProductId, setSelectedProductId] = React.useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = React.useState('');

  const [bottleVolume, setBottleVolume] = React.useState('');
  const [fullWeight, setFullWeight] = React.useState('');
  const [emptyWeight, setEmptyWeight] = React.useState('');
  const [currentWeight, setCurrentWeight] = React.useState('');
  // liquid level removed: height-based method is deprecated
  
  const [calculatedVolume, setCalculatedVolume] = React.useState<number | null>(null);
  const [calculationMethod, setCalculationMethod] = React.useState<'weight' | null>(null);
  /** 0 — без шага округления; null — расчёт ещё не выполняли */
  const [volumeRoundingStepMl, setVolumeRoundingStepMl] = React.useState<number | null>(null);
  
  const [isSending, setIsSending] = React.useState(false);
  
  // Состояние для разложения примиксов
  const [shouldExpandPremix, setShouldExpandPremix] = React.useState(false);
  const [sendMode, setSendMode] = React.useState<'set' | 'add'>('set');

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
    setCalculationMethod(null);
    setVolumeRoundingStepMl(null);
    // Сбрасываем состояние разложения при выборе нового продукта
    setShouldExpandPremix(false);
    setSendMode('set');
    setCurrentWeight('');
    if (product) {
        setBottleVolume(product.bottleVolumeMl?.toString() ?? '');
        setFullWeight(product.fullBottleWeightG?.toString() ?? '');
        setEmptyWeight(product.emptyBottleWeightG?.toString() ?? '');
    }
  };
  
  const selectedProduct = React.useMemo(() => {
    return products?.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);
  
  // Согласовано с products-context: примикс по флагу или по категории
  const isPremix =
    selectedProduct?.isPremix === true || selectedProduct?.category === 'Premix';
  
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
    setCurrentWeight('');
    setCalculatedVolume(null);
    setCalculationMethod(null);
    setVolumeRoundingStepMl(null);
    setShouldExpandPremix(false);
    setSendMode('set');
  };


  const handleCalculate = () => {
    setCalculatedVolume(null);
    setCalculationMethod(null);
    setVolumeRoundingStepMl(null);

    const bv = parseFloat(bottleVolume);
    const fw = parseFloat(fullWeight);
    const ew = parseFloat(emptyWeight);
    const cw = parseFloat(currentWeight);

    const result = calculateVolumeMl({
      bottleVolumeMl: bv,
      fullBottleWeightG: Number.isFinite(fw) ? fw : undefined,
      emptyBottleWeightG: Number.isFinite(ew) ? ew : undefined,
      currentWeightG: Number.isFinite(cw) ? cw : undefined,
    });

    if (!result.ok) {
      toast({
        variant: "destructive",
        title: "Ошибка расчета",
        description: result.errors.join(' '),
      });
      return;
    }

    setCalculatedVolume(result.volumeMl);
    setCalculationMethod(result.method);
    setVolumeRoundingStepMl(result.roundingStepMl);
    if (result.warnings.length > 0) {
      toast({
        title: "Проверка данных",
        description: result.warnings.join(' '),
      });
    }
  };

  const handleSendToInventory = async (volume: number | null) => {
    if (volume === null || !selectedProductId || !barId || !user || !selectedProduct) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Сначала рассчитайте объем и выберите продукт.",
      });
      return;
    }

    setIsSending(true);
    
    try {
        const sessionsRes = await fetch('/api/sessions', {
          cache: 'no-store',
        });
        const sessionsJson = await sessionsRes.json();
        if (!sessionsRes.ok || sessionsJson?.ok === false) throw new Error(sessionsJson?.error || 'Failed');
        const sessions = (sessionsJson.sessions ?? []) as InventorySession[];
        const activeSession = pickLatestInProgressSession(sessions);

        if (!activeSession) {
            toast({
                variant: "destructive",
                title: "Нет активной инвентаризации",
                description: "Пожалуйста, начните новую инвентаризацию на главной панели.",
            });
            setIsSending(false);
            return;
        }
        
        // Если это примикс и включено разложение на ингредиенты
        if (isPremix && shouldExpandPremix && selectedProduct.premixIngredients && selectedProduct.premixIngredients.length > 0) {
          // Разложить примикс на ингредиенты
          const ingredients = expandPremixToIngredients(selectedProduct, volume);
          const detailRes = await fetch(`/api/sessions/${activeSession.id}`, {
            cache: 'no-store',
          });
          const detailJson = await detailRes.json();
          if (!detailRes.ok || detailJson?.ok === false) throw new Error(detailJson?.error || 'Failed');
          const existingLines = (detailJson.lines ?? []) as InventoryLine[];

          const payloadLines = ingredients.map((ing) => {
            const existing = existingLines.find((l) => l.productId === ing.productId);
            const existingEndStock = existing?.endStock ?? 0;
            const newEndStock = sendMode === 'add' ? existingEndStock + ing.volumeMl : ing.volumeMl;
            return {
              id: existing?.id ?? `calc_${activeSession.id}_${ing.productId}`,
              productId: ing.productId,
              startStock: existing?.startStock ?? 0,
              purchases: existing?.purchases ?? 0,
              sales: existing?.sales ?? 0,
              endStock: newEndStock,
              theoreticalEndStock: existing?.theoreticalEndStock ?? 0,
              differenceVolume: existing?.differenceVolume ?? 0,
              differenceMoney: existing?.differenceMoney ?? 0,
              differencePercent: (existing as any)?.differencePercent ?? 0,
            };
          });

          await patchInventorySessionInLineChunks(activeSession.id, { upsertLines: payloadLines });

          toast({
            title: "Премикс разложен на ингредиенты",
            description: `Создано/обновлено ${ingredients.length} ингредиентов в инвентаризации. Режим: ${sendMode === 'add' ? 'прибавить' : 'установить'}.`,
          });
        } else {
          // Обычная логика (как раньше) - создать/обновить одну линию для продукта/примикса
          const detailRes = await fetch(`/api/sessions/${activeSession.id}`, {
            cache: 'no-store',
          });
          const detailJson = await detailRes.json();
          if (!detailRes.ok || detailJson?.ok === false) throw new Error(detailJson?.error || 'Failed');
          const existingLines = (detailJson.lines ?? []) as InventoryLine[];
          const existing = existingLines.find((l) => l.productId === selectedProductId);
          const existingEndStock = existing?.endStock ?? 0;
          const newEndStock = sendMode === 'add' ? existingEndStock + volume : volume;

          const payloadLine = {
            id: existing?.id ?? `calc_${activeSession.id}_${selectedProductId}`,
            productId: selectedProductId,
            startStock: existing?.startStock ?? 0,
            purchases: existing?.purchases ?? 0,
            sales: existing?.sales ?? 0,
            endStock: newEndStock,
            theoreticalEndStock: existing?.theoreticalEndStock ?? 0,
            differenceVolume: existing?.differenceVolume ?? 0,
            differenceMoney: existing?.differenceMoney ?? 0,
            differencePercent: (existing as any)?.differencePercent ?? 0,
          };

          const patchRes = await fetch(`/api/sessions/${activeSession.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ upsertLines: [payloadLine] }),
          });
          const patchJson = await patchRes.json();
          if (!patchRes.ok || patchJson?.ok === false) throw new Error(patchJson?.error || 'Failed');

          toast({
            title: "Данные отправлены",
            description:
              sendMode === 'add'
                ? `Остаток для продукта ${buildProductDisplayName(selectedProduct.name, selectedProduct.bottleVolumeMl)} (${volume} мл) прибавлен к существующему остатку (${existingEndStock} мл). Итого: ${newEndStock} мл.`
                : `Остаток для продукта ${buildProductDisplayName(selectedProduct.name, selectedProduct.bottleVolumeMl)} установлен в ${newEndStock} мл (было ${existingEndStock} мл).`,
          });
        }
    } catch (serverError: unknown) {
        const errorMessage = serverError instanceof Error ? serverError.message : 'Не удалось отправить данные в инвентаризацию';
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: errorMessage,
        });
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
          description="Выберите продукт, введите вес полной бутылки, вес пустой бутылки и текущий вес. Нажмите 'Рассчитать', затем 'Отправить в инвентаризацию'."
        />
        <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
      </div>

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
                  {calculationMethod && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Метод: по весу (без линейки)
                      {volumeRoundingStepMl !== null && volumeRoundingStepMl > 0
                        ? ` · Шаг округления: ${volumeRoundingStepMl} мл`
                        : ' · Округление не применяется'}
                    </p>
                  )}
                  <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 mb-2 min-w-0 px-1">
                    <p
                      className="text-4xl sm:text-5xl font-bold gradient-text max-w-full text-center break-words tabular-nums"
                      title={Number.isFinite(calculatedVolume) ? String(calculatedVolume) : undefined}
                    >
                      {formatVolumeMlForDisplay(calculatedVolume)}
                    </p>
                    <span className="text-2xl font-semibold text-muted-foreground shrink-0">мл</span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto text-pretty px-2">
                    Значение пропорционально разнице масс: сейчас и при полном разливе по карточке. Если расходится с мерником —
                    проверьте фактический вес полной и пустой бутылки в профиле.
                  </p>
                  
                  <div className="space-y-2 mt-2 mb-4">
                    <Label className="text-sm">Отправка в инвентаризацию</Label>
                    <Select value={sendMode} onValueChange={(v) => setSendMode(v === 'add' ? 'add' : 'set')}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set">Установить остаток (по умолчанию)</SelectItem>
                        <SelectItem value="add">Прибавить к остатку</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      “Установить” перезапишет остаток для продукта. “Прибавить” полезно, если вы намеренно суммируете несколько емкостей.
                    </p>
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
                          ? 'Премикс будет разложен на ингредиенты'
                          : 'Премикс будет отправлен как единое целое'}
                      </p>
                    </>
                  )}
                  
                  <Button 
                    onClick={() => handleSendToInventory(calculatedVolume)} 
                    className="w-full mt-2 font-semibold" 
                    disabled={calculatedVolume === null || isSending || !barId || !allowMutate}
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
