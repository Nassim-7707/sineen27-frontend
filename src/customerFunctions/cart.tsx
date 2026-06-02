import { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "@/adminFunctions/products";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
  unitPrice: number;
  batchId?: string;
}

export interface AddToCartPayload {
  product: Product;
  quantity?: number;
  selectedSize: string;
  selectedColor?: string;
  unitPrice: number;
}

export function cartItemKey(item: Pick<CartItem, "product" | "selectedSize" | "selectedColor">) {
  return `${item.product.id}|${item.selectedSize}|${item.selectedColor || ""}`;
}

interface CartContextType {
  items: CartItem[];
  addItem: (payload: AddToCartPayload) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (payload: AddToCartPayload) => {
    const {
      product,
      quantity = 1,
      selectedSize,
      selectedColor = product.colors?.[0] || "",
      unitPrice,
    } = payload;

    setItems((prev) => {
      const key = `${product.id}|${selectedSize}|${selectedColor}`;
      const existing = prev.find(
        (i) => cartItemKey(i) === key
      );
      if (existing) {
        return prev.map((i) =>
          cartItemKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        { product, quantity, selectedSize, selectedColor, unitPrice },
      ];
    });
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => cartItemKey(i) !== key));
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(key);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (cartItemKey(i) === key ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
