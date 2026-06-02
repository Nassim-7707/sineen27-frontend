import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { sizesMatch } from "@/adminFunctions/products";
import { batches as batchesApi } from "@/adminFunctions/api";

function qtyForSizeInRecord(
  quantities: Record<string, number>,
  size: string,
): number {
  let total = 0;
  for (const [key, qty] of Object.entries(quantities)) {
    if (sizesMatch(key, size)) total += qty || 0;
  }
  return total;
}

function deductQtyForSize(
  quantities: Record<string, number>,
  size: string,
  amount: number,
): Record<string, number> {
  const next = { ...quantities };
  let left = amount;
  const keys = Object.keys(next).filter(
    (k) => sizesMatch(k, size) && (next[k] || 0) > 0,
  );
  const exact = keys.find((k) => k.toLowerCase() === size.toLowerCase());
  const ordered = exact
    ? [exact, ...keys.filter((k) => k !== exact)]
    : keys;
  for (const key of ordered) {
    if (left <= 0) break;
    const available = next[key] || 0;
    if (available >= left) {
      next[key] = available - left;
      left = 0;
    } else {
      left -= available;
      next[key] = 0;
    }
  }
  return next;
}

type BatchStatus = "active" | "out_of_stock" | "archived";

/** دفعة قديمة بدون لون تُحسب لكل الألوان */
export function batchMatchesColor(batch: Batch, color?: string): boolean {
  if (!color) return true;
  const bc = (batch.color || "").trim();
  if (!bc) return true;
  return bc === color;
}

function batchRemainingTotal(batch: Batch): number {
  return Object.values(batch.remainingQuantities ?? {}).reduce(
    (sum, qty) => sum + (Number(qty) || 0),
    0,
  );
}

/** دفعة قابلة للبيع — غير مؤرشفة ولديها كمية متبقية */
function batchHasSellableStock(batch: Batch): boolean {
  if (batch.status === "archived") return false;
  return batchRemainingTotal(batch) > 0;
}

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  /** لون الدفعة — فارغ = دفعة قديمة تُحسب لكل الألوان */
  color?: string;
  supplierId: string | null;
  purchaseInvoiceId: string;
  receiveDate: string;
  purchasePrice: number;
  suggestedSellingPrice: number;
  initialQuantities: Record<string, number>;
  remainingQuantities: Record<string, number>;
  status: BatchStatus;
}

interface BatchesContextType {
  batches: Batch[];
  addBatches: (
    batches: Omit<Batch, "id" | "batchNumber" | "status">[],
  ) => Batch[];
  updateBatch: (id: string, updates: Partial<Batch>) => void;
  deductStock: (
    productId: string,
    size: string,
    quantity: number,
    preferredBatchId?: string,
    color?: string,
  ) => void;
  getProductTotalStock: (productId: string, catalogSizes?: string[]) => number;
  getProductStockBySize: (
    productId: string,
    size: string,
    color?: string,
  ) => number;
  getProductActiveBatches: (productId: string) => Batch[];
  getLowestSellingPrice: (productId: string) => number;
  getLowestSellingPriceBySize: (
    productId: string,
    size: string,
    color?: string,
  ) => number;
}

const BatchesContext = createContext<BatchesContextType | undefined>(undefined);

let batchCounter = 0;

function generateBatchNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  batchCounter++;
  const seq = String(batchCounter).padStart(4, "0");
  return `BCH-${y}${m}${d}-${seq}`;
}

export function BatchesProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    batchesApi.getAll().then((data: any[]) => {
      const mapped = data.map((b) => ({
        ...b,
        receiveDate: typeof b.receiveDate === "string" ? b.receiveDate : new Date(b.receiveDate).toISOString(),
      })) as Batch[];
      setBatches(mapped);
      batchCounter = mapped.length;
    }).catch(() => {});
  }, []);

  const saveBatches = (newBatches: Batch[]) => {
    const processed = newBatches.map((b) => {
      if (b.status === "archived") return b;
      const totalRemaining = batchRemainingTotal(b);
      return { ...b, status: totalRemaining === 0 ? "out_of_stock" : "active" } as Batch;
    });
    setBatches(processed);
  };

  const addBatches = (
    dataArray: Omit<Batch, "id" | "batchNumber" | "status">[],
  ): Batch[] => {
    const newBatches = dataArray.map((data) => ({
      ...data,
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      batchNumber: generateBatchNumber(),
      status: "active" as BatchStatus,
    }));
    saveBatches([...batches, ...newBatches]);
    return newBatches;
  };

  const updateBatch = (id: string, updates: Partial<Batch>) => {
    saveBatches(batches.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deductStock = (
    productId: string,
    size: string,
    quantity: number,
    preferredBatchId?: string,
    color?: string,
  ) => {
    let remainingToDeduct = quantity;
    const newBatches = [...batches];

    // If a preferred batch is provided (manual selection by manager)
    if (preferredBatchId) {
      const batchIndex = newBatches.findIndex((b) => b.id === preferredBatchId);
      if (batchIndex !== -1) {
        const batch = newBatches[batchIndex];
        const available = qtyForSizeInRecord(batch.remainingQuantities, size);

        if (available >= remainingToDeduct) {
          batch.remainingQuantities = deductQtyForSize(
            batch.remainingQuantities,
            size,
            remainingToDeduct,
          );
          remainingToDeduct = 0;
        } else {
          remainingToDeduct -= available;
          batch.remainingQuantities = deductQtyForSize(
            batch.remainingQuantities,
            size,
            available,
          );
        }
      }
    }

    // Fallback to FIFO if still need to deduct
    if (remainingToDeduct > 0) {
      // Sort active batches by receiveDate ascending (oldest first)
      const fifoBatches = newBatches
        .filter(
          (b) =>
            b.productId === productId &&
            batchHasSellableStock(b) &&
            batchMatchesColor(b, color) &&
            qtyForSizeInRecord(b.remainingQuantities, size) > 0,
        )
        .sort(
          (a, b) =>
            new Date(a.receiveDate).getTime() -
            new Date(b.receiveDate).getTime(),
        );

      for (const batch of fifoBatches) {
        if (remainingToDeduct <= 0) break;

        const available = qtyForSizeInRecord(batch.remainingQuantities, size);
        if (available >= remainingToDeduct) {
          batch.remainingQuantities = deductQtyForSize(
            batch.remainingQuantities,
            size,
            remainingToDeduct,
          );
          remainingToDeduct = 0;
        } else {
          remainingToDeduct -= available;
          batch.remainingQuantities = deductQtyForSize(
            batch.remainingQuantities,
            size,
            available,
          );
        }
      }
    }

    if (remainingToDeduct > 0) {
      console.warn(
        `Not enough stock across all batches for Product ${productId} Size ${size}. Missing ${remainingToDeduct} items.`,
      );
    }

    saveBatches(newBatches);
  };

  const getSellableBatches = (productId: string, color?: string): Batch[] =>
    batches.filter(
      (b) =>
        b.productId === productId &&
        batchHasSellableStock(b) &&
        batchMatchesColor(b, color),
    );

  const sumAllSellableStock = (productId: string, color?: string): number =>
    getSellableBatches(productId, color).reduce(
      (total, batch) => total + batchRemainingTotal(batch),
      0,
    );

  const getProductTotalStock = (
    productId: string,
    catalogSizes?: string[],
  ): number => {
    const sumAll = () => sumAllSellableStock(productId);

    if (!catalogSizes?.length) {
      return sumAll();
    }

    const byCatalogSizes = catalogSizes.reduce(
      (sum, size) => sum + getProductStockBySize(productId, size),
      0,
    );

    if (byCatalogSizes > 0) return byCatalogSizes;

    return sumAll();
  };

  const getProductStockBySize = (
    productId: string,
    size: string,
    color?: string,
  ): number => {
    return getSellableBatches(productId, color).reduce(
      (total, batch) =>
        total + qtyForSizeInRecord(batch.remainingQuantities, size),
      0,
    );
  };

  const getProductActiveBatches = (productId: string): Batch[] => {
    return getSellableBatches(productId).sort(
      (a, b) =>
        new Date(a.receiveDate).getTime() - new Date(b.receiveDate).getTime(),
    );
  };

  const getLowestSellingPrice = (productId: string): number => {
    const activeBatches = getProductActiveBatches(productId);
    if (activeBatches.length === 0) return 0;
    return Math.min(...activeBatches.map((b) => b.suggestedSellingPrice));
  };

  const getLowestSellingPriceBySize = (
    productId: string,
    size: string,
    color?: string,
  ): number => {
    const activeBatches = getProductActiveBatches(productId).filter(
      (b) =>
        batchMatchesColor(b, color) &&
        qtyForSizeInRecord(b.remainingQuantities, size) > 0,
    );
    if (activeBatches.length === 0) return 0;
    return Math.min(...activeBatches.map((b) => b.suggestedSellingPrice));
  };

  return (
    <BatchesContext.Provider
      value={{
        batches,
        addBatches,
        updateBatch,
        deductStock,
        getProductTotalStock,
        getProductStockBySize,
        getProductActiveBatches,
        getLowestSellingPrice,
        getLowestSellingPriceBySize,
      }}
    >
      {children}
    </BatchesContext.Provider>
  );
}

export function useBatches() {
  const context = useContext(BatchesContext);
  if (!context)
    throw new Error("useBatches must be used within BatchesProvider");
  return context;
}
