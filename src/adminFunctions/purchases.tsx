import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { saveToStorage, loadFromStorage } from "@/adminFunctions/storage";
import { purchases as purchasesApi } from "@/adminFunctions/api";
import { useBatches } from "@/adminFunctions/batches";
import { clampDateToToday, validateInvoiceDate } from "@/adminFunctions/validation";
import { useSuppliers } from "@/adminFunctions/suppliers";
import {
  iteratePurchaseVariants,
  normalizePurchaseItem,
  DEFAULT_VARIANT_COLOR,
  type PurchaseLineDraft,
  type PurchaseInvoiceItem,
  type PurchaseSizeLine,
} from "@/adminFunctions/variantStock";
import { batchMatchesColor, type Batch } from "@/adminFunctions/batches";
import { sizesMatch } from "@/adminFunctions/products";
import { products as productsApi } from "@/adminFunctions/api";

export type { PurchaseInvoiceItem, PurchaseSizeLine };
export type PurchasePaymentMethod = "cash" | "credit" | "partial" | "barter";
export type PurchaseStatus = "Paid" | "Partially Paid" | "Unpaid" | "Cancelled";

export function sanitizePurchasePayload(
  data: Omit<PurchaseInvoice, "id" | "invoiceNumber" | "status" | "batchIds">,
): Omit<PurchaseInvoice, "id" | "invoiceNumber" | "status" | "batchIds"> {
  const items = (data.items || []).map((raw) =>
    normalizePurchaseItem(raw as PurchaseLineDraft),
  );
  const totalAmount = items.reduce((sum, item) => {
    return (
      sum +
      iteratePurchaseVariants(item).reduce(
        (a, v) => a + v.data.quantity * v.data.purchasePrice,
        0,
      )
    );
  }, 0);
  const date = data.date ? clampDateToToday(data.date) : data.date;
  return {
    ...data,
    date,
    items,
    totalAmount,
    paidAmount: data.paidAmount ?? totalAmount,
  };
}

function buildBatchesFromItems(
  items: PurchaseInvoiceItem[],
  meta: {
    supplierId: string | null;
    purchaseInvoiceId: string;
    receiveDate: string;
  },
) {
  const batchDataArray: Omit<
    import("./batches").Batch,
    "id" | "batchNumber" | "status"
  >[] = [];

  items.forEach((item) => {
    iteratePurchaseVariants(item).forEach(({ color, size, data }) => {
      if (data.quantity > 0 && data.purchasePrice > 0) {
        batchDataArray.push({
          productId: item.productId,
          color,
          supplierId: meta.supplierId,
          purchaseInvoiceId: meta.purchaseInvoiceId,
          receiveDate: meta.receiveDate,
          purchasePrice: data.purchasePrice,
          suggestedSellingPrice: data.suggestedSellingPrice,
          initialQuantities: { [size]: data.quantity },
          remainingQuantities: { [size]: data.quantity },
        });
      }
    });
  });

  return batchDataArray;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string | null;
  supplierInvoiceNumber?: string;
  date: string;
  notes?: string;
  items: PurchaseInvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  paymentMethod: PurchasePaymentMethod;
  status: PurchaseStatus;
  batchIds: string[]; // Batches created from this invoice
}

interface PurchasesContextType {
  purchases: PurchaseInvoice[];
  addPurchaseInvoice: (
    invoiceData: Omit<
      PurchaseInvoice,
      "id" | "invoiceNumber" | "status" | "batchIds"
    >,
  ) => PurchaseInvoice;
  cancelPurchaseInvoice: (invoiceId: string) => {
    success: boolean;
    error?: string;
  };
  updatePurchaseInvoice: (
    invoiceId: string,
    updates: Partial<PurchaseInvoice>,
  ) => { success: boolean; error?: string };
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(
  undefined,
);

let invoiceCounter = 0;

function migratePurchaseLineItem(
  raw: PurchaseLineDraft,
): PurchaseInvoiceItem {
  const hasColors = raw.colors && Object.keys(raw.colors).length > 0;
  const hasLegacySizes = raw.sizes && Object.keys(raw.sizes).length > 0;
  if (!hasColors && hasLegacySizes) return normalizePurchaseItem(raw);
  if (hasColors) {
    return {
      productId: raw.productId,
      colors: raw.colors as PurchaseInvoiceItem["colors"],
    };
  }
  return normalizePurchaseItem(raw);
}

/** هل بيعت قطعة واحدة على الأقل من دفعات هذه الفاتورة؟ */
export function invoiceHasSales(
  invoice: PurchaseInvoice,
  allBatches: Batch[],
): boolean {
  const invoiceBatches = allBatches.filter(
    (b) => b.purchaseInvoiceId === invoice.id && b.status !== "archived",
  );
  return invoiceBatches.some((batch) =>
    Object.entries(batch.initialQuantities).some(
      ([sizeKey, initial]) =>
        Math.max(0, initial - (batch.remainingQuantities[sizeKey] || 0)) > 0,
    ),
  );
}

export function canCancelPurchaseInvoice(
  invoice: PurchaseInvoice,
  allBatches: Batch[],
): boolean {
  if (invoice.status === "Cancelled") return false;
  return !invoiceHasSales(invoice, allBatches);
}

/** أدنى كمية مسموحة عند التعديل (المباعة) — مفتاح `${color}|${size}` */
export function getProductVariantMinQty(
  invoice: PurchaseInvoice,
  allBatches: Batch[],
  productId: string,
): Record<string, number> {
  const mins: Record<string, number> = {};
  const invoiceBatches = allBatches.filter(
    (b) => b.purchaseInvoiceId === invoice.id && b.status !== "archived",
  );

  for (const batch of invoiceBatches) {
    if (batch.productId !== productId) continue;
    const color = (batch.color || DEFAULT_VARIANT_COLOR).trim();
    for (const [sizeKey, initial] of Object.entries(batch.initialQuantities)) {
      const sold = Math.max(
        0,
        initial - (batch.remainingQuantities[sizeKey] || 0),
      );
      if (sold <= 0) continue;
      const existing = Object.keys(mins).find((k) => {
        const [c, s] = k.split("|");
        return c === color && sizesMatch(s, sizeKey);
      });
      const cellKey = existing || `${color}|${sizeKey}`;
      mins[cellKey] = Math.max(mins[cellKey] || 0, sold);
    }
  }
  return mins;
}

function findVariantInItems(
  items: PurchaseInvoiceItem[],
  productId: string,
  batchColor: string,
  sizeKey: string,
): { color: string; size: string; data: PurchaseSizeLine } | null {
  for (const item of items) {
    if (item.productId !== productId) continue;
    for (const v of iteratePurchaseVariants(item)) {
      if (!batchMatchesColor({ color: v.color } as Batch, batchColor || undefined))
        continue;
      if (!sizesMatch(v.size, sizeKey)) continue;
      return v;
    }
  }
  return null;
}

function primarySizeKey(batch: Batch, logicalSize: string): string {
  const keys = Object.keys(batch.initialQuantities);
  const exact = keys.find((k) => k.toLowerCase() === logicalSize.toLowerCase());
  if (exact) return exact;
  const matched = keys.find((k) => sizesMatch(k, logicalSize));
  return matched || logicalSize;
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  invoiceCounter++;
  const seq = String(invoiceCounter).padStart(4, "0");
  return `PINV-${y}${m}${d}-${seq}`;
}

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const { addBatches, batches, updateBatch, refreshBatches } = useBatches();
  const { recordDebt } = useSuppliers();

  useEffect(() => {
    const cached = loadFromStorage<PurchaseInvoice[]>("purchases");
    if (cached && cached.length > 0) { setPurchases(cached); invoiceCounter = cached.length; }
    purchasesApi.getAll().then((data: any[]) => {
      if (!data || data.length === 0) return;
      const mapped = data.map((inv) => ({
        ...inv,
        items: (inv.items ?? []).map((raw: any) => migratePurchaseLineItem(raw as PurchaseLineDraft)),
        batchIds: (inv.batches ?? []).map((b: any) => b.id),
        status: inv.status === "paid" ? "Paid" : inv.status === "partial" ? "Partially Paid" : inv.status === "cancelled" ? "Cancelled" : "Unpaid",
      })) as PurchaseInvoice[];
      setPurchases(mapped);
      invoiceCounter = mapped.length;
    }).catch(() => {});
  }, []);

  const savePurchases = (newPurchases: PurchaseInvoice[]) => {
    setPurchases(newPurchases);
    saveToStorage("purchases", newPurchases);
  };

  const addPurchaseInvoice = (
    invoiceData: Omit<
      PurchaseInvoice,
      "id" | "invoiceNumber" | "status" | "batchIds"
    >,
  ): PurchaseInvoice => {
    const dateCheck = validateInvoiceDate(invoiceData.date || "");
    if (!dateCheck.valid) {
      throw new Error(dateCheck.message);
    }
    const newInvoiceId = `pinv-${Date.now()}`;
    const invoiceNum = generateInvoiceNumber();
    const sanitized = sanitizePurchasePayload(invoiceData);
    const status: PurchaseStatus =
      sanitized.paidAmount >= sanitized.totalAmount
        ? "Paid"
        : sanitized.paidAmount > 0
          ? "Partially Paid"
          : "Unpaid";

    const batchDataArray = buildBatchesFromItems(sanitized.items, {
      supplierId: sanitized.supplierId,
      purchaseInvoiceId: newInvoiceId,
      receiveDate: sanitized.date,
    });

    const createdBatches = addBatches(batchDataArray);
    const batchIds = createdBatches.map((b) => b.id);

    // Update product basePriceDZD with suggestedSellingPrice so it syncs to store
    batchDataArray.forEach((batchData) => {
      if (batchData.suggestedSellingPrice > 0) {
        productsApi.update(batchData.productId, {
          basePriceDZD: batchData.suggestedSellingPrice,
        }).catch(() => {});
      }
    });

    // 2. Create Invoice
    const newInvoice: PurchaseInvoice = {
      ...sanitized,
      id: newInvoiceId,
      invoiceNumber: invoiceNum,
      status,
      batchIds,
    };

    savePurchases([newInvoice, ...purchases]);

    // Sync to backend then reload batches to show updated stock
    purchasesApi.create({
      clientId: newInvoiceId,
      invoiceNumber: invoiceNum,
      supplierId: sanitized.supplierId,
      date: sanitized.date,
      items: sanitized.items,
      totalAmount: sanitized.totalAmount,
      paidAmount: sanitized.paidAmount,
      notes: sanitized.notes,
    }).then(() => {
      // Reload batches from database to show accurate stock
      refreshBatches();
    }).catch(() => {});

    // 3. Update Supplier Debt if unpaid
    if (
      sanitized.supplierId &&
      sanitized.totalAmount > sanitized.paidAmount
    ) {
      const debt = sanitized.totalAmount - sanitized.paidAmount;
      recordDebt(sanitized.supplierId, debt);
    }

    return newInvoice;
  };

  const cancelPurchaseInvoice = (
    invoiceId: string,
  ): { success: boolean; error?: string } => {
    const invoice = purchases.find((p) => p.id === invoiceId);
    if (!invoice) return { success: false, error: "الفاتورة غير موجودة" };
    if (invoice.status === "Cancelled")
      return { success: false, error: "ملغاة بالفعل" };

    if (invoiceHasSales(invoice, batches)) {
      return {
        success: false,
        error:
          "لا يمكن إلغاء الفاتورة: تم بيع قطعة واحدة أو أكثر منها. يمكنك تعديل الفاتورة فقط.",
      };
    }

    const invoiceBatches = batches.filter((b) =>
      b.purchaseInvoiceId === invoice.id,
    );

    // Safe to cancel
    // Archive the batches
    for (const batch of invoiceBatches) {
      updateBatch(batch.id, { status: "archived", remainingQuantities: {} });
    }

    savePurchases(
      purchases.map((p) =>
        p.id === invoiceId ? { ...p, status: "Cancelled" } : p,
      ),
    );

    // NOTE: If we wanted to reverse supplier debt, we should do it here, but it requires
    // recording a payment for the exact debt amount created.
    // For simplicity we'll let the user handle supplier balances manually on cancellation.

    return { success: true };
  };

  const updatePurchaseInvoice = (
    invoiceId: string,
    updates: Partial<PurchaseInvoice>,
  ): { success: boolean; error?: string } => {
    const invoice = purchases.find((p) => p.id === invoiceId);
    if (!invoice) return { success: false, error: "الفاتورة غير موجودة" };

    if (updates.date !== undefined) {
      const dateCheck = validateInvoiceDate(updates.date);
      if (!dateCheck.valid) {
        return { success: false, error: dateCheck.message };
      }
      updates = { ...updates, date: clampDateToToday(updates.date) };
    }

    if (updates.items) {
      const normalizedItems = updates.items.map((raw) =>
        normalizePurchaseItem(raw as PurchaseLineDraft),
      );
      const itemsChanged =
        JSON.stringify(normalizedItems) !== JSON.stringify(invoice.items);

      if (itemsChanged) {
        const invoiceBatches = batches.filter(
          (b) => b.purchaseInvoiceId === invoice.id && b.status !== "archived",
        );
        const nextBatchIds = new Set<string>();
        const coveredVariantKeys = new Set<string>();

        const markCovered = (productId: string, color: string, size: string) => {
          const c = (color || DEFAULT_VARIANT_COLOR).trim();
          const s = sizesMatch(size, "standard") ? "__std__" : size.trim().toLowerCase();
          coveredVariantKeys.add(`${productId}|${c}|${s}`);
        };

        const isVariantCovered = (
          productId: string,
          color: string,
          size: string,
        ): boolean => {
          const c = (color || DEFAULT_VARIANT_COLOR).trim();
          const sNorm = sizesMatch(size, "standard")
            ? "__std__"
            : size.trim().toLowerCase();
          const key = `${productId}|${c}|${sNorm}`;
          if (coveredVariantKeys.has(key)) return true;
          for (const k of coveredVariantKeys) {
            const [pid, col, sz] = k.split("|");
            if (pid !== productId || col !== c) continue;
            if (sz === "__std__" && sizesMatch(size, "standard")) return true;
            if (sizesMatch(sz, size)) return true;
          }
          return false;
        };

        for (const batch of invoiceBatches) {
          const batchColor = (batch.color || "").trim();
          for (const [sizeKey, initial] of Object.entries(
            batch.initialQuantities,
          )) {
            const sold = Math.max(
              0,
              initial - (batch.remainingQuantities[sizeKey] || 0),
            );
            const match = findVariantInItems(
              normalizedItems,
              batch.productId,
              batchColor,
              sizeKey,
            );

            if (!match || (match.data.quantity || 0) <= 0) {
              if (sold > 0) {
                return {
                  success: false,
                  error: `لا يمكن حذف تركيبة تم بيعها (${batch.batchNumber}: ${sizeKey}).`,
                };
              }
              updateBatch(batch.id, {
                status: "archived",
                remainingQuantities: {},
              });
              continue;
            }

            const newQty = match.data.quantity;
            if (newQty < sold) {
              return {
                success: false,
                error: `الكمية أقل من المباع: ${sizeKey} — المباع ${sold} والمدخل ${newQty}.`,
              };
            }

            const key = primarySizeKey(batch, match.size);
            updateBatch(batch.id, {
              initialQuantities: { [key]: newQty },
              remainingQuantities: { [key]: newQty - sold },
              purchasePrice: match.data.purchasePrice,
              suggestedSellingPrice: match.data.suggestedSellingPrice,
              receiveDate:
                updates.date !== undefined ? updates.date : batch.receiveDate,
              supplierId:
                updates.supplierId !== undefined
                  ? updates.supplierId
                  : batch.supplierId,
            });
            markCovered(batch.productId, batchColor, sizeKey);
            markCovered(batch.productId, batchColor, match.size);
            nextBatchIds.add(batch.id);
          }
        }

        const newBatchPayload: Omit<
          Batch,
          "id" | "batchNumber" | "status"
        >[] = [];

        normalizedItems.forEach((item) => {
          iteratePurchaseVariants(item).forEach(({ color, size, data }) => {
            if (data.quantity <= 0 || data.purchasePrice <= 0) return;
            if (isVariantCovered(item.productId, color, size)) return;
            newBatchPayload.push({
              productId: item.productId,
              color,
              supplierId:
                updates.supplierId !== undefined
                  ? updates.supplierId
                  : invoice.supplierId,
              purchaseInvoiceId: invoice.id,
              receiveDate:
                updates.date !== undefined ? updates.date : invoice.date,
              purchasePrice: data.purchasePrice,
              suggestedSellingPrice: data.suggestedSellingPrice,
              initialQuantities: { [size]: data.quantity },
              remainingQuantities: { [size]: data.quantity },
            });
          });
        });

        if (newBatchPayload.length > 0) {
          const created = addBatches(newBatchPayload);
          created.forEach((b) => nextBatchIds.add(b.id));
        }

        batches
          .filter(b => b.purchaseInvoiceId === invoice.id && b.status !== "archived")
          .forEach((b) => {
            if (nextBatchIds.has(b.id)) return;
            updateBatch(b.id, { status: "archived", remainingQuantities: {} });
          });

        updates.items = normalizedItems;
        updates.batchIds = Array.from(nextBatchIds);
      }
    } else {
      // Just updating metadata (e.g. date, supplier). Update existing batches metadata if needed.
      if (updates.date !== undefined || updates.supplierId !== undefined) {
        const invoiceBatches = batches.filter((b) =>
          b.purchaseInvoiceId === invoice.id,
        );
        for (const batch of invoiceBatches) {
          updateBatch(batch.id, {
            receiveDate:
              updates.date !== undefined ? updates.date : batch.receiveDate,
            supplierId:
              updates.supplierId !== undefined
                ? updates.supplierId
                : batch.supplierId,
          });
        }
      }
    }

    const merged =
      updates.items != null
        ? {
            ...updates,
            ...sanitizePurchasePayload({
              supplierId:
                updates.supplierId !== undefined
                  ? updates.supplierId
                  : invoice.supplierId,
              date: updates.date !== undefined ? updates.date : invoice.date,
              notes: updates.notes !== undefined ? updates.notes : invoice.notes,
              items: updates.items,
              totalAmount: updates.totalAmount ?? invoice.totalAmount,
              paidAmount: updates.paidAmount ?? invoice.paidAmount,
              paymentMethod:
                updates.paymentMethod !== undefined
                  ? updates.paymentMethod
                  : invoice.paymentMethod,
            }),
          }
        : updates;

    savePurchases(
      purchases.map((p) => (p.id === invoiceId ? { ...p, ...merged } : p)),
    );

    // Update product prices from updated invoice items
    if (updates.items) {
      updates.items.forEach((item: any) => {
        const price = item.suggestedSellingPrice || item.data?.suggestedSellingPrice || 0;
        if (item.productId && price > 0) {
          productsApi.update(item.productId, { basePriceDZD: price }).catch(() => {});
        }
      });
    }

    return { success: true };
  };

  return (
    <PurchasesContext.Provider
      value={{
        purchases,
        addPurchaseInvoice,
        cancelPurchaseInvoice,
        updatePurchaseInvoice,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases() {
  const context = useContext(PurchasesContext);
  if (!context)
    throw new Error("usePurchases must be used within PurchasesProvider");
  return context;
}
