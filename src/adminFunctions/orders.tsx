import { saveToStorage, loadFromStorage } from "@/adminFunctions/storage";
import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from "react";
import type { Product } from "@/adminFunctions/products";
import { mergeWilayaCommunes, defaultCommunesForWilaya } from "@/adminFunctions/communes";
import { orders as ordersApi, wilayas as wilayasApi } from "@/adminFunctions/api";

export function mergeWilayaFees(saved: Record<string, number> | null | undefined): Record<string, number> {
  const merged: Record<string, number> = { ...initialWilayaFees };
  if (saved && typeof saved === "object") {
    Object.entries(saved).forEach(([key, fee]) => {
      if (typeof fee === "number" && Number.isFinite(fee)) merged[key] = fee;
    });
  }
  return merged;
}

export type OrderStatus = "قيد التحضير" | "تم التسليم" | "ملغى" | "مكتمل";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  "قيد التحضير": "قيد التحضير",
  "تم التسليم": "تم التسليم",
  "ملغى": "ملغى",
  "مكتمل": "مكتمل",
};

export const initialWilayaFees: Record<string, number> = {
  "01 - Adrar": 1200, "02 - Chlef": 600, "03 - Laghouat": 800, "04 - Oum El Bouaghi": 600,
  "05 - Batna": 600, "06 - Béjaïa": 600, "07 - Biskra": 800, "08 - Béchar": 1000,
  "09 - Blida": 400, "10 - Bouira": 500, "11 - Tamanrasset": 1500, "12 - Tébessa": 700,
  "13 - Tlemcen": 600, "14 - Tiaret": 600, "15 - Tizi Ouzou": 500, "16 - Alger": 400,
  "17 - Djelfa": 700, "18 - Jijel": 600, "19 - Sétif": 600, "20 - Saïda": 600,
  "21 - Skikda": 600, "22 - Sidi Bel Abbès": 600, "23 - Annaba": 600, "24 - Guelma": 600,
  "25 - Constantine": 600, "26 - Médéa": 500, "27 - Mostaganem": 600, "28 - M'Sila": 600,
  "29 - Mascara": 600, "30 - Ouargla": 1000, "31 - Oran": 600, "32 - El Bayadh": 800,
  "33 - Illizi": 1500, "34 - Bordj Bou Arréridj": 600, "35 - Boumerdès": 400, "36 - El Tarf": 600,
  "37 - Tindouf": 1500, "38 - Tissemsilt": 600, "39 - El Oued": 900, "40 - Khenchela": 700,
  "41 - Souk Ahras": 600, "42 - Tipaza": 400, "43 - Mila": 600, "44 - Aïn Defla": 500,
  "45 - Naâma": 900, "46 - Aïn Témouchent": 600, "47 - Ghardaïa": 900, "48 - Relizane": 600,
  "49 - Timimoun": 1200, "50 - Bordj Badji Mokhtar": 1500, "51 - Ouled Djellal": 800, "52 - Béni Abbès": 1000,
  "53 - In Salah": 1500, "54 - In Guezzam": 1500, "55 - Touggourt": 900, "56 - Djanet": 1500,
  "57 - El M'Ghair": 800, "58 - El Meniaa": 900
};

export let algerianWilayas = Object.keys(initialWilayaFees);

export interface OrderItem {
  productName: string;
  productId: string;
  quantity: number;
  size: string;
  color?: string;
  price: number;
  costAtSale?: number;
}

export interface Order {
  id: string;
  orderNumber?: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerWilaya: string;
  customerAddress?: string;
  deliveryType: "Yalidine" | "Zr Express" | "محل";
  items: OrderItem[];
  totalDZD: number;
  totalAmount?: number;
  subtotal?: number;
  globalDiscountPercent?: number;
  globalDiscountAmount?: number;
  advancePayment?: number;
  paymentMethod?: string;
  reserveStock?: boolean;
  customerId?: string | null;
  status: OrderStatus;
  isOnlineOrder: boolean;
  deliveryFee?: number;
  cashierName?: string;
  notes?: string;
  commune?: string;
}

export interface PosCartItem {
  product: Product;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
}

export function getEffectiveUnitPrice(item: PosCartItem): number {
  const pct = Math.min(100, Math.max(0, item.lineDiscount || 0));
  return Math.round(item.unitPrice * (1 - pct / 100));
}

export function getLineSubtotal(item: PosCartItem): number {
  return item.quantity * getEffectiveUnitPrice(item);
}

export function getPosCartSubtotal(cart: PosCartItem[]): number {
  return cart.reduce((sum, item) => sum + getLineSubtotal(item), 0);
}

export function getPosCartQtyForVariant(
  cart: PosCartItem[],
  productId: string,
  size: string,
  color: string,
  excludeIdx?: number,
): number {
  return cart.reduce((sum, item, idx) => {
    if (idx === excludeIdx) return sum;
    if (item.product.id === productId && item.size === size && item.color === color) {
      return sum + item.quantity;
    }
    return sum;
  }, 0);
}

interface OrdersContextType {
  orders: Order[];
  wilayaFees: Record<string, number>;
  wilayaCommunes: Record<string, string[]>;
  communeOverrides: Record<string, string[]>;
  addOrder: (order: Omit<Order, "id" | "date" | "status">) => string;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  updateWilayaFee: (wilaya: string, fee: number) => void;
  addWilaya: (name: string, fee: number) => void;
  deleteWilaya: (wilaya: string) => void;
  renameWilaya: (oldName: string, newName: string) => void;
  updateCommuneOverrides: (wilaya: string, communes: string[]) => void;
  setWilayaCommunesList: (wilaya: string, communes: string[]) => void;
  restoreMissingWilayas: () => number;
  getDeliveryFee: (wilaya: string) => number;
  getCommunesForWilaya: (wilaya: string) => string[];
  completeSale: (order: Omit<Order, "id" | "date" | "status">) => Promise<string>;
  refreshOrders: () => void;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

function mapStatus(backendStatus: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    pending: "قيد التحضير",
    confirmed: "قيد التحضير",
    shipped: "قيد التحضير",
    completed: "مكتمل",
    cancelled: "ملغى",
    returned: "ملغى",
  };
  return map[backendStatus] || "قيد التحضير";
}

function mapBackendToFrontend(o: any): Order {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    date: o.date || new Date().toISOString(),
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerWilaya: o.customerWilaya,
    customerAddress: o.customerAddress,
    deliveryType: o.deliveryType === "ZrExpress" ? "Zr Express" : o.deliveryType === "store" ? "محل" : "Yalidine",
    items: Array.isArray(o.items) ? o.items : [],
    totalDZD: o.totalDZD,
    status: mapStatus(o.status),
    isOnlineOrder: o.isOnlineOrder ?? false,
    deliveryFee: o.deliveryFee,
    cashierName: o.cashierName,
    notes: o.notes,
  };
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [wilayaFees, setWilayaFees] = useState<Record<string, number>>(initialWilayaFees);
  const [communeOverrides, setCommuneOverrides] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadOrders();
    loadWilayaFees();
  }, []);

  async function loadOrders() {
    const cached = loadFromStorage<Order[]>("orders");
    if (cached && cached.length > 0) setOrders(cached);
    try {
      const data = await ordersApi.getAll() as any[];
      if (data) {
        const mapped = data.map(mapBackendToFrontend);
        setOrders(mapped);
        saveToStorage("orders", mapped);
      }
    } catch {}
  }

  async function loadWilayaFees() {
    try {
      const data = await wilayasApi.getAll() as any[];
      if (data && data.length > 0) {
        const fees: Record<string, number> = {};
        data.forEach((w: any) => { fees[w.wilayaCode] = w.deliveryFee; });
        setWilayaFees(mergeWilayaFees(fees));
      }
    } catch {}
  }

  function saveLocal(newOrders: Order[]) {
    setOrders(newOrders);
    saveToStorage("orders", newOrders);
  }

  const refreshOrders = useCallback(() => { loadOrders(); }, []);

  const getCommunesForWilaya = useCallback((wilaya: string): string[] => {
    if (communeOverrides[wilaya]) return communeOverrides[wilaya];
    return defaultCommunesForWilaya(wilaya);
  }, [communeOverrides]);

  const wilayaCommunes = useMemo<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    Object.keys(wilayaFees).forEach((w) => {
      result[w] = communeOverrides[w] || defaultCommunesForWilaya(w);
    });
    return result;
  }, [wilayaFees, communeOverrides]);

  const addOrder = (order: Omit<Order, "id" | "date" | "status">): string => {
    const id = Date.now().toString();
    const newOrder: Order = { ...order, id, date: new Date().toISOString(), status: "قيد التحضير" };
    saveLocal([newOrder, ...orders]);
    ordersApi.create({
      clientId: id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerWilaya: order.customerWilaya,
      customerAddress: order.customerAddress,
      deliveryType: order.deliveryType === "Zr Express" ? "ZrExpress" : order.deliveryType === "محل" ? "store" : "Yalidine",
      items: order.items,
      totalDZD: order.totalDZD,
      deliveryFee: order.deliveryFee ?? 0,
      isOnlineOrder: order.isOnlineOrder,
      notes: order.notes,
    }).catch(() => {});
    return id;
  };

  const updateOrder = (id: string, updates: Partial<Order>) => {
    saveLocal(orders.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const deleteOrder = (id: string) => {
    saveLocal(orders.filter(o => o.id !== id));
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    saveLocal(orders.map(o => o.id === id ? { ...o, status } : o));
    const backendStatus = status === "مكتمل" ? "completed" : status === "ملغى" ? "cancelled" : status === "تم التسليم" ? "shipped" : "confirmed";
    try {
      await ordersApi.updateStatus(id, backendStatus);
      await loadOrders(); // reload from database to confirm
    } catch {}
  };

  const completeSale = async (order: Omit<Order, "id" | "date" | "status">): Promise<string> => {
    const id = Date.now().toString();
    const newOrder: Order = { ...order, id, date: new Date().toISOString(), status: "مكتمل", isOnlineOrder: false };
    saveLocal([newOrder, ...orders]);
    try {
      await ordersApi.completePOS({
        clientId: id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items,
        totalDZD: order.totalDZD,
        cashierName: order.cashierName || "admin",
        customerId: order.customerId,
      });
      await loadOrders(); // reload from database to confirm
    } catch {}
    return id;
  };

  const updateWilayaFee = (wilaya: string, fee: number) => {
    setWilayaFees(prev => ({ ...prev, [wilaya]: fee }));
    wilayasApi.updateFee(wilaya, fee).catch(() => {});
  };

  const addWilaya = (name: string, fee: number) => {
    setWilayaFees(prev => ({ ...prev, [name]: fee }));
  };

  const deleteWilaya = (wilaya: string) => {
    setWilayaFees(prev => { const next = { ...prev }; delete next[wilaya]; return next; });
  };

  const renameWilaya = (oldName: string, newName: string) => {
    const fee = wilayaFees[oldName] ?? 0;
    const communes = communeOverrides[oldName];
    setWilayaFees(prev => { const next = { ...prev }; delete next[oldName]; next[newName] = fee; return next; });
    if (communes) {
      setCommuneOverrides(prev => { const next = { ...prev, [newName]: communes }; delete next[oldName]; return next; });
    }
  };

  const updateCommuneOverrides = (wilaya: string, communes: string[]) => {
    setCommuneOverrides(prev => ({ ...prev, [wilaya]: communes }));
  };

  const setWilayaCommunesList = updateCommuneOverrides;

  const restoreMissingWilayas = (): number => {
    const existing = new Set(Object.keys(wilayaFees));
    const missing = Object.entries(initialWilayaFees).filter(([k]) => !existing.has(k));
    setWilayaFees({ ...initialWilayaFees, ...wilayaFees });
    return missing.length;
  };

  const getDeliveryFee = (wilaya: string): number => wilayaFees[wilaya] ?? 0;

  return (
    <OrdersContext.Provider value={{
      orders, wilayaFees, wilayaCommunes, communeOverrides,
      addOrder, updateOrder, deleteOrder, updateOrderStatus,
      updateWilayaFee, addWilaya, deleteWilaya, renameWilaya,
      updateCommuneOverrides, setWilayaCommunesList, restoreMissingWilayas,
      getDeliveryFee, getCommunesForWilaya,
      completeSale, refreshOrders,
    }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
