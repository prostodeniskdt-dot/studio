'use client';

import * as React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Package, X } from 'lucide-react';
import { ProductCard } from './product-card';
import { ProductSearch } from './product-search';
import type { Product, ProductCategory } from '@/lib/types';
import { translateCategory, dedupeProductsByName, buildProductDisplayName, productCategories, productSubCategories } from '@/lib/utils';

interface ProductsCardViewProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAdd: () => void;
  isArchiving?: string | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedCategory?: ProductCategory;
  onCategoryChange?: (category: ProductCategory | undefined) => void;
  selectedSubCategory?: string;
  onSubCategoryChange?: (subCategory: string | undefined) => void;
  showArchived?: boolean;
  onShowArchivedChange?: (show: boolean) => void;
}

export function ProductsCardView({
  products,
  onEdit,
  onArchive,
  onDelete,
  onAdd,
  isArchiving = null,
  searchQuery = '',
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSubCategory,
  onSubCategoryChange,
  showArchived = false,
  onShowArchivedChange,
}: ProductsCardViewProps) {
  // Дедупликация продуктов
  const uniqueProducts = React.useMemo(() => {
    return dedupeProductsByName(products);
  }, [products]);

  // Фильтрация продуктов
  const filteredProducts = React.useMemo(() => {
    let filtered = uniqueProducts;

    // Фильтр по статусу (активные/архивированные)
    if (!showArchived) {
      filtered = filtered.filter(p => p.isActive !== false);
    }

    // Фильтр по категории
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Фильтр по подкатегории
    if (selectedSubCategory) {
      filtered = filtered.filter(p => p.subCategory === selectedSubCategory);
    }

    // Поиск по названию
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const displayName = buildProductDisplayName(p.name, p.bottleVolumeMl).toLowerCase();
        return displayName.includes(query) || p.name.toLowerCase().includes(query);
      });
    }

    return filtered;
  }, [uniqueProducts, showArchived, selectedCategory, selectedSubCategory, searchQuery]);

  // Группировка продуктов по категориям
  const productsByCategory = React.useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    
    filteredProducts.forEach(product => {
      const category = product.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });

    // Сортировка категорий по алфавиту (по переведенным названиям)
    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => 
        translateCategory(a as ProductCategory).localeCompare(translateCategory(b as ProductCategory))
      )
    );
  }, [filteredProducts]);

  // Получить все ключи категорий для defaultValue Accordion
  const allCategoryKeys = React.useMemo(() => {
    return Object.keys(productsByCategory);
  }, [productsByCategory]);

  return (
    <div className="w-full space-y-4">
      {/* Поиск, фильтры и кнопка добавления */}
      <div className="space-y-3">
        {/* Поисковая строка и кнопка добавления на одной линии */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <ProductSearch
              value={searchQuery}
              onChange={onSearchChange || (() => {})}
              inline={true}
              placeholder="Поиск продуктов..."
            />
          </div>
          <Button onClick={onAdd} className="h-9 flex-shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        </div>
        
        {/* Фильтры отдельно ниже */}
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-start">
          <Select
            value={selectedCategory || '__all__'}
            onValueChange={(val) => onCategoryChange?.(val === '__all__' ? undefined : (val as ProductCategory))}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Все категории</SelectItem>
              {productCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {translateCategory(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCategory && productSubCategories[selectedCategory] && productSubCategories[selectedCategory].length > 0 && (
            <Select
              value={selectedSubCategory || '__all__'}
              onValueChange={(val) => onSubCategoryChange?.(val === '__all__' ? undefined : val)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Подкатегория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все подкатегории</SelectItem>
                {productSubCategories[selectedCategory].map((subCat) => (
                  <SelectItem key={subCat} value={subCat}>
                    {subCat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(searchQuery || selectedCategory || selectedSubCategory) && (
            <Button 
              variant="outline" 
              onClick={() => {
                onSearchChange?.('');
                onCategoryChange?.(undefined);
                onSubCategoryChange?.(undefined);
              }} 
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Очистить
            </Button>
          )}
        </div>
        
        {/* Счетчик результатов */}
        <div className="text-sm text-muted-foreground">
          Найдено продуктов: {filteredProducts.length}
        </div>
        
        {onShowArchivedChange && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showArchivedCards"
              checked={showArchived}
              onCheckedChange={(checked) => onShowArchivedChange(checked === true)}
            />
            <label
              htmlFor="showArchivedCards"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Показать архивированные
            </label>
          </div>
        )}
      </div>

      {/* Если нет продуктов после фильтрации */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title={searchQuery || selectedCategory ? "Продукты не найдены" : "Нет продуктов"}
          description={
            searchQuery || selectedCategory
              ? 'Попробуйте изменить поисковый запрос или фильтры.'
              : 'Создайте свой первый продукт для использования в калькуляторе и инвентаризации.'
          }
        />
      ) : (
        <Accordion 
          type="multiple" 
          defaultValue={allCategoryKeys}
          className="w-full"
        >
        {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
          <AccordionItem key={category} value={category} className="border-b">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="font-medium">{translateCategory(category as ProductCategory)}</span>
                <Badge variant="secondary" className="text-xs">
                  {categoryProducts.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    isArchiving={isArchiving === product.id}
                    compact
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        </Accordion>
      )}
    </div>
  );
}

