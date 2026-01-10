'use client';

import * as React from 'react';
import { Edit2, Archive, ArchiveRestore, MoreHorizontal, Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Product } from '@/lib/types';
import { buildProductDisplayName, translateCategory, translateSubCategory, cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
  onDelete: (product: Product) => void;
  onSendToLibrary?: (product: Product) => void;
  isArchiving?: boolean;
  compact?: boolean;
}

export const ProductCard = React.memo<ProductCardProps>(({ 
  product, 
  onEdit, 
  onArchive, 
  onDelete,
  onSendToLibrary,
  isArchiving = false,
  compact = true
}) => {
  const isActive = product.isActive ?? true;
  const canSendToLibrary = onSendToLibrary && product.barId && product.isInLibrary !== true;

  return (
    <Card 
      className={cn(
        "flex flex-col transition-all duration-200 hover:shadow-md",
        compact && "hover:scale-[1.01]",
        isActive 
          ? "border-border hover:border-primary/40" 
          : "opacity-60"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate flex items-center gap-2">
              {isActive && (
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              )}
              <span className="truncate">{buildProductDisplayName(product.name, product.bottleVolumeMl)}</span>
            </CardTitle>
            <CardDescription className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              <Badge variant="secondary" className="text-xs">
                {translateCategory(product.category)}
              </Badge>
              {product.subCategory && (
                <Badge variant="outline" className="text-xs">
                  {translateSubCategory(product.subCategory)}
                </Badge>
              )}
              <Badge 
                variant={isActive ? 'default' : 'outline'} 
                className="text-xs"
              >
                {isActive ? 'Активен' : 'Архивирован'}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-2">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Объем</div>
            <div className="font-semibold">{product.bottleVolumeMl} мл</div>
          </div>
          {product.fullBottleWeightG && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Вес</div>
              <div className="font-semibold">{product.fullBottleWeightG}г</div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(product)}
          className="flex-1 text-xs"
        >
          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
          Редактировать
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="px-2"
              disabled={isArchiving}
            >
              {isArchiving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MoreHorizontal className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">Открыть меню</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Действия</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onArchive(product)}>
              {isActive ? (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Архивировать
                </>
              ) : (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Восстановить
                </>
              )}
            </DropdownMenuItem>
            {canSendToLibrary && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSendToLibrary(product)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Отправить в библиотеку
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={() => onDelete(product)}
            >
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

