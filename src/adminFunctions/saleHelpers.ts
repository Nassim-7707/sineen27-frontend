import type { Order } from "@/adminFunctions/orders";
import type { Product } from "@/adminFunctions/products";

export function buildSaleItemsFromOrder(order: Order, products: Product[]) {
  return order.items.map((i) => {
    const product = products.find(
      (p) => p.id === i.productId || p.name === i.productName,
    );
    if (!product) {
      throw new Error(`المنتج غير موجود: ${i.productName}`);
    }
    return {
      product,
      quantity: i.quantity,
      selectedSize: i.size,
      selectedColor: i.color || product.colors?.[0] || "",
      unitPrice: i.price,
    };
  });
}
