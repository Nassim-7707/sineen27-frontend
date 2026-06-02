import { priceAfterDiscount } from "@/adminFunctions/margins";

export function hasProductDiscount(discountPercent?: number): boolean {
  return (discountPercent ?? 0) > 0;
}

/** سعر البيع المعروض للزبون بعد خصم المنتج */
export function applyProductDiscount(
  basePrice: number,
  discountPercent?: number,
): number {
  const base = basePrice || 0;
  if (base <= 0) return 0;
  if (!hasProductDiscount(discountPercent)) return base;
  return priceAfterDiscount(base, discountPercent ?? 0);
}
