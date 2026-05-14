/** Поля продукта, которые не должны попадать напрямую в `data` Prisma `product.update`. */
export const PRODUCT_PATCH_FORBIDDEN_KEYS = new Set([
  'premixIngredients',
  'purchaseOrderLines',
  'inventoryLines',
  'bar',
  'defaultSupplier',
  'usedAsIngredientIn',
  'createdAt',
  'updatedAt',
]);

/** Убираем связи/служебные ключи перед `product.update`; `premixIngredients` обрабатываются отдельно. */
export function prismaProductPatchData(productPatch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...productPatch };
  for (const k of PRODUCT_PATCH_FORBIDDEN_KEYS) {
    delete out[k];
  }
  return out;
}
