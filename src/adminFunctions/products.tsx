import React, { createContext, useContext, useState, useEffect } from "react";
import { sanitizeProductCopy } from "@/adminFunctions/plainCopy";
import { getAdminCatalogProducts } from "@/adminFunctions/productDisplay";
import { products as api } from "@/adminFunctions/api";

export interface Product {
  id: string;
  name: string;
  image: string;
  imageUrl?: string;
  description?: string;
  colors: string[];
  sizes: string[];
  category: string;
  featured: boolean;
  isPublished: boolean;
  sortOrder: number;
  washInstructions?: string;
  archived: boolean;
  discountPercent?: number;
  basePriceDZD?: number;
  costPriceDZD?: number;
  stock?: Record<string, number>;
  sizePrices?: Record<string, number>;
  sizeCostPrices?: Record<string, number>;
  reorderLevel?: number;
}

// map backend product (imageUrl) to frontend shape (image)
function mapProduct(p: any): Product {
  return {
    ...p,
    image: p.imageUrl || p.image || "/placeholder.svg",
  };
}

interface ProductsContextType {
  products: Product[];
  categorySizes: Record<string, string[]>;
  categories: string[];
  addProduct: (p: Omit<Product, "id" | "archived">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductPublished: (id: string) => void;
  moveProduct: (id: string, direction: "up" | "down") => void;
  updateFilter: (type: 'categorySizes' | 'categories', action: 'add' | 'remove', value: string, category?: string) => void;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categorySizes, setCategorySizes] = useState<Record<string, string[]>>({
    "سجادة": ["صغير", "متوسط", "كبير"], "طقم صلاة": ["Standard", "XL"],
    "عمامة": ["صغير", "كبير", "54", "56", "58"], "قميص": ["S", "M", "L", "XL", "XXL"],
    "عباءة": ["52", "54", "56", "58", "60"]
  });
  const [categories, setCategories] = useState<string[]>(["سجادة", "طقم صلاة", "عمامة", "قميص", "عباءة"]);

  // ── Load products ─────────────────────────────────────────
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await api.getAll() as any[];
      setProducts(data ? data.map(mapProduct) : []);
    } catch (err: any) {
      if (err?.status === 401) {
        // Token expired — clear and let auth guard handle redirect
        setProducts([]);
      }
      // Network error — keep current state (don't wipe products on flaky connection)
      console.warn("[Products] Load failed:", err?.message);
    }
  }

  // ── Save helpers ──────────────────────────────────────────
  function saveLocal(newProducts: Product[]) {
    setProducts(newProducts);
  }

  function saveFilters(cs: Record<string, string[]>, cats: string[]) {
    setCategorySizes(cs);
    setCategories(cats);
  }

  // ── CRUD ──────────────────────────────────────────────────
  const addProduct = async (p: Omit<Product, "id" | "archived">) => {
    const newProduct: Product = sanitizeProductCopy({
      ...p, id: Date.now().toString(), archived: false,
      isPublished: p.isPublished ?? true,
      sortOrder: products.filter(x => !x.archived).length,
    });

    // Optimistic update in UI
    saveLocal([...products, newProduct]);

    // Strip base64 image before sending to backend (too large)
    // Only send URL images, not base64 data URLs
    const isBase64 = newProduct.image?.startsWith("data:");
    const imageForBackend = isBase64 ? "/placeholder.svg" : newProduct.image;

    try {
      const saved = await api.create({
        ...newProduct,
        clientId: newProduct.id,
        imageUrl: imageForBackend,
        image: undefined, // don't send image field
      }) as any;

      // Keep local image (base64) for display, use server id
      const merged = { ...mapProduct(saved), image: newProduct.image };
      saveLocal([...products.filter(x => x.id !== newProduct.id), merged]);
      await loadProducts();
    } catch (err: any) {
      console.error("[Products] Failed to save:", err?.message);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    saveLocal(products.map(p => p.id === id ? sanitizeProductCopy({ ...p, ...updates }) : p));
    try {
      await api.update(id, { ...updates, imageUrl: updates.image });
    } catch {}
  };

  const deleteProduct = async (id: string) => {
    // Optimistic update in UI
    saveLocal(products.map(p => p.id === id ? { ...p, archived: true } : p));
    try {
      await api.archive(id);
      // Reload from backend to confirm deletion persisted
      await loadProducts();
    } catch {
      // If API call failed, revert the optimistic update
      await loadProducts();
    }
  };

  const toggleProductPublished = async (id: string) => {
    const target = products.find(p => p.id === id);
    if (!target || target.archived) return;
    const next = !target.isPublished;
    saveLocal(products.map(p => p.id === id ? { ...p, isPublished: next } : p));
    try {
      if (next) await api.publish(id);
      else await api.unpublish(id);
      // Reload to confirm change persisted
      await loadProducts();
    } catch {
      await loadProducts();
    }
  };

  const moveProduct = (id: string, direction: "up" | "down") => {
    const catalog = getAdminCatalogProducts(products);
    const idx = catalog.findIndex(p => p.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= catalog.length) return;
    const reordered = [...catalog];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const activeIds = new Set(reordered.map(p => p.id));
    const withOrder = [
      ...reordered.map((p, i) => ({ ...p, sortOrder: i })),
      ...products.filter(p => !activeIds.has(p.id)).map((p, i) => ({ ...p, sortOrder: reordered.length + i })),
    ];
    saveLocal(withOrder);
  };

  const updateFilter = (type: 'categorySizes' | 'categories', action: 'add' | 'remove', value: string, category?: string) => {
    if (type === 'categorySizes' && category) {
      let nCS = { ...categorySizes };
      let list = nCS[category] ? [...nCS[category]] : [];
      if (action === 'add') list.push(value);
      else list = list.filter(v => v !== value);
      nCS[category] = list;
      setCategorySizes(nCS);
      saveFilters(nCS, categories);
    } else if (type === 'categories') {
      let nCats = [...categories];
      if (action === 'add') nCats.push(value);
      else nCats = nCats.filter(v => v !== value);
      const filtered = nCats.filter(v => v !== "الكل");
      setCategories(filtered);
      saveFilters(categorySizes, filtered);
    }
  };

  return (
    <ProductsContext.Provider value={{
      products, categorySizes, categories,
      addProduct, updateProduct, deleteProduct,
      toggleProductPublished, moveProduct, updateFilter,
    }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
}

export const DEFAULT_PRODUCT_IMAGE = "/placeholder.svg";
export function getProductImageSrc(image?: string | null): string {
  return image?.trim() || DEFAULT_PRODUCT_IMAGE;
}
export function isStandardSize(size: string): boolean {
  const s = String(size || "").toLowerCase();
  return s.startsWith("standard") || s.startsWith("stander");
}
export function sizesMatch(stored: string, requested: string): boolean {
  const a = String(stored || "").trim();
  const b = String(requested || "").trim();
  if (!a || !b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  if (isStandardSize(a) && isStandardSize(b)) return true;
  return false;
}
export function sizeLabel(size: string): string {
  return isStandardSize(size) ? "القطعة" : size;
}
