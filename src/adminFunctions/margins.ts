import type { Batch } from "@/adminFunctions/batches";
import { batchMatchesColor } from "@/adminFunctions/batches";
import { sizesMatch } from "@/adminFunctions/products";
import type { PosCartItem } from "@/adminFunctions/orders";
import { getLineSubtotal } from "@/adminFunctions/orders";
import {
  iteratePurchaseVariantsFromDraft,
  type PurchaseInvoiceItem,
  type PurchaseLineDraft,
} from "@/adminFunctions/variantStock";

export interface MarginSummary {
  totalCost: number;
  totalRevenue: number;
  profit: number;
  isLoss: boolean;
  /** نسبة الربح من إجمالي البيع المتوقع */
  marginPercent: number;
}

export function calcPurchaseItemsMargin(
  items: (PurchaseLineDraft | PurchaseInvoiceItem)[],
): MarginSummary {
  let totalCost = 0;
  let totalRevenue = 0;

  for (const item of items) {
    for (const v of iteratePurchaseVariantsFromDraft(item)) {
      const q = v.data.quantity || 0;
      if (q <= 0) continue;
      const buy = v.data.purchasePrice || 0;
      const sell = v.data.suggestedSellingPrice || 0;
      totalCost += q * buy;
      totalRevenue += q * sell;
    }
  }

  const profit = totalRevenue - totalCost;
  return {
    totalCost,
    totalRevenue,
    profit,
    isLoss: profit < 0,
    marginPercent:
      totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0,
  };
}

export function calcVariantLineProfit(
  quantity: number,
  purchasePrice: number,
  sellingPrice: number,
): number {
  const q = quantity || 0;
  return q * ((sellingPrice || 0) - (purchasePrice || 0));
}

export function getLowestPurchasePriceForProduct(
  productId: string,
  batches: Batch[],
): number {
  const active = batches.filter(
    (b) => b.productId === productId && b.status === "active",
  );
  if (active.length === 0) return 0;
  return Math.min(...active.map((b) => b.purchasePrice));
}

/** أدنى سعر شراء لتركيبة لون + مقاس من الدفعات النشطة */
export function getPurchasePriceForVariant(
  productId: string,
  size: string,
  color: string | undefined,
  batches: Batch[],
): number {
  const prices: number[] = [];
  for (const b of batches) {
    if (b.productId !== productId || b.status !== "active") continue;
    if (!batchMatchesColor(b, color)) continue;
    const hasSize = Object.keys(b.initialQuantities).some((k) =>
      sizesMatch(k, size),
    );
    if (hasSize) prices.push(b.purchasePrice);
  }
  if (prices.length > 0) return Math.min(...prices);
  return getLowestPurchasePriceForProduct(productId, batches);
}

export function priceAfterDiscount(
  unitPrice: number,
  discountPercent: number,
): number {
  const pct = Math.min(100, Math.max(0, discountPercent || 0));
  return Math.max(0, Math.round(unitPrice * (1 - pct / 100)));
}

/** هل سعر البيع بعد الخصم أقل من التكلفة؟ */
export function wouldDiscountCauseLoss(
  unitSellPrice: number,
  discountPercent: number,
  unitCost: number,
): boolean {
  if (unitCost <= 0 || unitSellPrice <= 0) return false;
  return priceAfterDiscount(unitSellPrice, discountPercent) < unitCost;
}

export function calcPosCartMargin(
  cart: PosCartItem[],
  batches: Batch[],
): MarginSummary {
  let totalCost = 0;
  let totalRevenue = 0;

  for (const item of cart) {
    const unitCost = getPurchasePriceForVariant(
      item.product.id,
      item.size,
      item.color,
      batches,
    );
    totalCost += unitCost * item.quantity;
    totalRevenue += getLineSubtotal(item);
  }

  const profit = totalRevenue - totalCost;
  return {
    totalCost,
    totalRevenue,
    profit,
    isLoss: profit < 0,
    marginPercent:
      totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0,
  };
}

export function formatMarginLabel(summary: MarginSummary): string {
  if (summary.totalRevenue <= 0 && summary.totalCost <= 0) return "—";
  if (summary.isLoss) {
    return `خسارة ${Math.abs(summary.profit).toLocaleString()} دج`;
  }
  return `ربح ${summary.profit.toLocaleString()} دج`;
}
