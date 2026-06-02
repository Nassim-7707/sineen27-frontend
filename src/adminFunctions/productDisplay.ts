import type { Product } from "@/adminFunctions/products";
import { applyProductDiscount } from "@/customerFunctions/productPricing";

/** ترتيب العرض في الموقع (الأصغر = يظهر أولاً) */
export function sortProductsByDisplayOrder(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
}

/** منتجات ظاهرة للزبائن */
export function getPublicProducts(products: Product[]): Product[] {
  return sortProductsByDisplayOrder(products).filter(
    (p) => !p.archived && p.isPublished,
  );
}

/** كتالوج لوحة التحكم (غير المحذوف) */
export function getAdminCatalogProducts(products: Product[]): Product[] {
  return sortProductsByDisplayOrder(products).filter((p) => !p.archived);
}

/**
 * منتجات مشابهة: نفس الفئة، ثم الأقرب سعراً (بعد الخصم إن وُجد).
 */
export function pickSimilarProducts(
  current: Product,
  catalog: Product[],
  getBasePrice: (productId: string) => number,
  limit = 3,
): Product[] {
  const currentPrice = applyProductDiscount(
    getBasePrice(current.id),
    current.discountPercent,
  );

  return catalog
    .filter((p) => p.id !== current.id && p.category === current.category)
    .map((p) => {
      const salePrice = applyProductDiscount(
        getBasePrice(p.id),
        p.discountPercent,
      );
      return {
        product: p,
        priceDiff: Math.abs(salePrice - currentPrice),
        sortOrder: p.sortOrder ?? 0,
      };
    })
    .sort((a, b) => {
      if (a.priceDiff !== b.priceDiff) return a.priceDiff - b.priceDiff;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, limit)
    .map((entry) => entry.product);
}
