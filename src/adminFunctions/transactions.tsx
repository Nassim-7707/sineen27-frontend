import { createContext, useContext, ReactNode } from "react";
import type { CartItem } from "@/customerFunctions/cart";
import { useBatches } from "@/adminFunctions/batches";
import { useCustomers } from "@/adminFunctions/customers";

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string | null;
  items: CartItem[];
  subtotal: number;
  globalDiscountPercent: number;
  globalDiscountAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  status: "Completed" | "Cancelled" | "Returned";
  cashierName?: string;
  notes?: string;
}

interface TransactionsContextType {
  completeSale: (
    invoiceData: Omit<SalesInvoice, "id" | "invoiceNumber" | "status">,
  ) => SalesInvoice;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);
let invoiceCounter = 0;

function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  invoiceCounter++;
  return `SINV-${y}${m}${d}-${String(invoiceCounter).padStart(4, "0")}`;
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { deductStock } = useBatches();
  const { recordDebt, incrementPurchaseCount } = useCustomers();

  const completeSale = (
    invoiceData: Omit<SalesInvoice, "id" | "invoiceNumber" | "status">,
  ): SalesInvoice => {
    const newInvoice: SalesInvoice = {
      ...invoiceData,
      id: `sinv-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(),
      status: "Completed",
    };

    for (const item of invoiceData.items) {
      if (item.product) {
        deductStock(item.product.id, item.selectedSize, item.quantity, item.batchId, item.selectedColor);
      }
    }

    if (invoiceData.customerId && invoiceData.paidAmount < invoiceData.totalAmount) {
      recordDebt(invoiceData.customerId, invoiceData.totalAmount - invoiceData.paidAmount);
    }

    if (invoiceData.customerId) {
      incrementPurchaseCount(invoiceData.customerId);
    }

    return newInvoice;
  };

  return (
    <TransactionsContext.Provider value={{ completeSale }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) throw new Error("useTransactions must be used within TransactionsProvider");
  return context;
}
