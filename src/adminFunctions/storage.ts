/**
 * storage.ts — Central localStorage persistence layer.
 * All contexts write here so data survives page refreshes.
 */
const KEYS = {
  products:  "sineen_products",
  batches:   "sineen_batches",
  purchases: "sineen_purchases",
  orders:    "sineen_orders",
  customers: "sineen_customers",
  suppliers: "sineen_suppliers",
  wilayas:   "sineen_wilaya_fees",
};

export function saveToStorage<T>(key: keyof typeof KEYS, data: T): void {
  try { localStorage.setItem(KEYS[key], JSON.stringify(data)); }
  catch (e) { console.warn(`[Storage] Failed to save ${key}:`, e); }
}

export function loadFromStorage<T>(key: keyof typeof KEYS): T | null {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
