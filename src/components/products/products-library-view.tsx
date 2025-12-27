'use client';

import * as React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, X, Download } from 'lucide-react';
import { ProductSearch } from './product-search';
import type { Product, ProductCategory } from '@/lib/types';
import { translateCategory, dedupeProductsByName, buildProductDisplayName, productCategories, productSubCategories } from '@/lib/utils';
import { ProductCard } from './product-card';

interface ProductsLibraryViewProps {
  products: Product[];
  onAddToMyProducts: (product: Product) => void;
  isAdding?: string | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedCategory?: ProductCategory;
  onCategoryChange?: (category: ProductCategory | undefined) => void;
  selectedSubCategory?: string;
  onSubCategoryChange?: (subCategory: string | undefined) => void;
}

export function ProductsLibraryView({
  products,
  onAddToMyProducts,
  isAdding = null,
  searchQuery = '',
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSubCategory,
  onSubCategoryChange,
}: ProductsLibraryViewProps) {
  // Дедупликация продуктов
  const uniqueProducts = React.useMemo(() => {
    return dedupeProductsByName(products);
  }, [products]);

  // Фильтрация продуктов
  const filteredProducts = React.useMemo(() => {
    let filtered = uniqueProducts;

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
  }, [uniqueProducts, selectedCategory, selectedSubCategory, searchQuery]);

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

  const allCategoryKeys = React.useMemo(() => {
    return Object.keys(productsByCategory);
  }, [productsByCategory]);

  return (
    <div className="w-full space-y-4">
      {/* Поиск и фильтры */}
      <div className="flex flex-col sm:flex-row gap-4">
        {onSearchChange && (
          <div className="flex-1">
            <ProductSearch
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          {onCategoryChange && (
            <Select
              value={selectedCategory || '__all__'}
              onValueChange={(val) => onCategoryChange(val === '__all__' ? undefined : val as ProductCategory)}
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
          )}
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
      </div>
      
      {/* Счетчик результатов */}
      <div className="text-sm text-muted-foreground">
        Найдено продуктов: {filteredProducts.length}
      </div>

      {/* Если нет продуктов после фильтрации */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title={searchQuery || selectedCategory ? "Продукты не найдены" : "Библиотека пуста"}
          description={
            searchQuery || selectedCategory
              ? 'Попробуйте изменить поисковый запрос или фильтры.'
              : 'В библиотеке пока нет продуктов. Добавьте свои продукты и отправьте их в библиотеку, чтобы они стали доступны другим пользователям.'
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
                  <div key={product.id} className="relative">
                    <ProductCard
                      product={product}
                      onEdit={() => {}} // Не показываем редактирование для библиотечных продуктов
                      onArchive={() => {}} // Не показываем архивирование
                      onDelete={() => {}} // Не показываем удаление
                      compact
                    />
                    <div className="absolute bottom-16 right-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onAddToMyProducts(product)}
                        disabled={isAdding === product.id}
                        className="shadow-lg"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        {isAdding === product.id ? 'Добавление...' : 'В мои продукты'}
                      </Button>
                    </div>
                  </div>
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

