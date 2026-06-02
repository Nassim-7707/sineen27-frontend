import React, { createContext, useContext, useState, useEffect } from "react";
import { sanitizeProductCopy } from "@/adminFunctions/plainCopy";
import { getAdminCatalogProducts } from "@/adminFunctions/productDisplay";
import { products as api } from "@/adminFunctions/api";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";
import product5 from "@/assets/product-5.jpg";
import product6 from "@/assets/product-6.jpg";

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

const INITIAL_PRODUCTS: Product[] = [
  { id: "prod-1", name: "عباءة 'شيهانة' بتطريز خليجي", image: product1, description: "عباءة بتطريز يدوي على الأطراف.", colors: ["أسود", "ذهبي"], sizes: ["52", "54", "56", "58", "60"], category: "عباءة", featured: true, isPublished: true, sortOrder: 0, archived: false },
  { id: "prod-2", name: "عباءة 'لميس' بشت ندى ناعم", image: product2, description: "عباءة بشت بقصة مريحة.", colors: ["أسود", "كحلي"], sizes: ["54", "56", "58"], category: "قميص", featured: true, isPublished: true, sortOrder: 1, archived: false },
  { id: "prod-3", name: "فستان بتطريز خفيف 'حورية'", image: product3, description: "فستان بخامة ناعمة منسدلة.", colors: ["أخضر زيتي"], sizes: ["50", "52", "54"], category: "عباءة", featured: false, isPublished: true, sortOrder: 2, archived: false },
  { id: "prod-4", name: "عباءة 'نور' المفتوحة", image: product4, description: "عباءة بقماش كريب.", colors: ["أسود"], sizes: ["54", "56", "58"], category: "عباءة", featured: true, isPublished: true, sortOrder: 3, archived: false },
  { id: "prod-5", name: "طقم الصلاة الإسلامي المستور", image: product5, description: "طقم صلاة متكامل.", colors: ["وردي فاتح", "رمادي مسود"], sizes: ["Standard"], category: "طقم صلاة", featured: true, isPublished: true, sortOrder: 4, archived: false },
  { id: "prod-6", name: "عباءة 'الكوثر' بتفاصيل الزم", image: product6, description: "تزميم على مستوى المعصم.", colors: ["بني داكن", "أسود"], sizes: ["52", "54", "56"], category: "قميص", featured: false, isPublished: true, sortOrder: 5, archived: false },
];

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
      setProducts(data && data.length > 0 ? data.map(mapProduct) : INITIAL_PRODUCTS);
    } catch {
      setProducts(INITIAL_PRODUCTS);
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

    // Optimistic update
    saveLocal([...products, newProduct]);

    try {
      const saved = await api.create({
        ...newProduct,
        clientId: newProduct.id,
        imageUrl: newProduct.image,
      }) as any;
      // Replace temp id with server id
      saveLocal(products.map(x => x.id === newProduct.id ? mapProduct({ ...saved }) : x).concat(
        products.find(x => x.id === newProduct.id) ? [] : [mapProduct(saved)]
      ));
      await loadProducts();
    } catch {}
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    saveLocal(products.map(p => p.id === id ? sanitizeProductCopy({ ...p, ...updates }) : p));
    try {
      await api.update(id, { ...updates, imageUrl: updates.image });
    } catch {}
  };

  const deleteProduct = async (id: string) => {
    saveLocal(products.map(p => p.id === id ? { ...p, archived: true } : p));
    try {
      await api.archive(id);
    } catch {}
  };

  const toggleProductPublished = async (id: string) => {
    const target = products.find(p => p.id === id);
    if (!target || target.archived) return;
    const next = !target.isPublished;
    saveLocal(products.map(p => p.id === id ? { ...p, isPublished: next } : p));
    try {
      if (next) await api.publish(id);
      else await api.unpublish(id);
    } catch {}
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
