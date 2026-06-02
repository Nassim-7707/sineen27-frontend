import type { CartItem } from "@/customerFunctions/cart";

export function calcOrderSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function calcOrderTotal(subtotal: number, deliveryFee: number): number {
  return subtotal + deliveryFee;
}
