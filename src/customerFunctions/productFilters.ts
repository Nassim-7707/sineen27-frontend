import { getPublicProducts } from "@/adminFunctions/productDisplay";
import { hasProductDiscount } from "@/customerFunctions/productPricing";
import type { Product } from "@/adminFunctions/products";

export function getFilteredProducts(products: Product[], category: string): Product[] {
  const publicProducts = getPublicProducts(products);
  return category ? publicProducts.filter((p) => p?.category === category) : publicProducts;
}

export function getOffersProducts(products: Product[]): Product[] {
  return getPublicProducts(products).filter((p) => hasProductDiscount(p.discountPercent));
}
