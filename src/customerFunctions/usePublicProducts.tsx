/**
 * usePublicProducts — fetches published products from the public API
 * Used by storefront pages (no auth required)
 */
import { useState, useEffect } from "react";
import type { Product } from "@/adminFunctions/products";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function usePublicProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/products`)
      .then(r => r.json())
      .then((data: any[]) => {
        setProducts(data.map(p => ({
          ...p,
          image: p.imageUrl || p.image || "/placeholder.svg",
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return { products, categories, loading };
}
