'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import type { ProductCategory } from '@/lib/types';
import { productCategories, productSubCategories, translateCategory } from '@/lib/utils';

export interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  onCategoryChange?: (category: ProductCategory | undefined) => void;
  onSubCategoryChange?: (subCategory: string | undefined) => void;
  selectedCategory?: ProductCategory;
  selectedSubCategory?: string;
  showFilters?: boolean;
  placeholder?: string;
  resultsCount?: number;
  isLoading?: boolean;
}

export function ProductSearch({
  value,
  onChange,
  onCategoryChange,
  onSubCategoryChange,
  selectedCategory,
  selectedSubCategory,
  showFilters = true,
  placeholder = 'Поиск продуктов...',
  resultsCount,
  isLoading = false,
}: ProductSearchProps) {
  const debouncedValue = useDebounce(value, 300);
  const [isSearching, setIsSearching] = React.useState(false);

  React.useEffect(() => {
    setIsSearching(value !== debouncedValue);
  }, [value, debouncedValue]);

  const handleClear = () => {
    onChange('');
    onCategoryChange?.(undefined);
    onSubCategoryChange?.(undefined);
  };

  const hasActiveFilters = value || selectedCategory || selectedSubCategory;

  const subCategoryOptions = React.useMemo(() => {
    if (!selectedCategory || !productSubCategories[selectedCategory]) return [];
    return productSubCategories[selectedCategory];
  }, [selectedCategory]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-9"
          />
          {(isSearching || isLoading) && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {value && !isSearching && !isLoading && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => onChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {showFilters && (
          <>
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
            {selectedCategory && subCategoryOptions.length > 0 && (
              <Select
                value={selectedSubCategory || '__all__'}
                onValueChange={(val) => onSubCategoryChange?.(val === '__all__' ? undefined : val)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Подкатегория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Все подкатегории</SelectItem>
                  {subCategoryOptions.map((subCat) => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}
        {hasActiveFilters && (
          <Button variant="outline" onClick={handleClear} className="w-full sm:w-auto">
            <X className="mr-2 h-4 w-4" />
            Очистить
          </Button>
        )}
      </div>
      {resultsCount !== undefined && (
        <div className="text-sm text-muted-foreground">
          Найдено продуктов: {resultsCount}
        </div>
      )}
    </div>
  );
}

