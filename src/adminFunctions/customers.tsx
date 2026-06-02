import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { customers as customersApi } from "@/adminFunctions/api";

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  wilaya?: string;
  commune?: string;
  address?: string;
  totalDebt?: number;
  purchaseCount?: number;
  notes?: string;
}

interface CustomersContextType {
  customers: Customer[];
  addCustomer: (c: Omit<Customer, "id">) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  settleDebt: (id: string, amount: number) => void;
  recordDebt: (id: string, amount: number) => void;
  incrementPurchaseCount: (id: string) => void;
}

const CustomersContext = createContext<CustomersContextType | undefined>(undefined);
export function CustomersProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await customersApi.getAll() as Customer[];
      if (data) setCustomers(data);
    } catch {}
  }

  const addCustomer = async (c: Omit<Customer, "id">) => {
    const id = Date.now().toString();
    setCustomers(prev => [...prev, { ...c, id }]);
    try {
      await customersApi.create({ ...c, clientId: id });
      await load();
    } catch {}
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    try { await customersApi.update(id, updates); } catch {}
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const settleDebt = async (id: string, amount: number) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, totalDebt: Math.max(0, (c.totalDebt || 0) - amount) } : c));
    try { await customersApi.settleDebt(id, amount); } catch {}
  };

  const recordDebt = (id: string, amount: number) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, totalDebt: (c.totalDebt || 0) + amount } : c));
  };

  const incrementPurchaseCount = (id: string) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, purchaseCount: (c.purchaseCount || 0) + 1 } : c));
  };

  return (
    <CustomersContext.Provider value={{
      customers, addCustomer, updateCustomer, deleteCustomer,
      settleDebt, recordDebt, incrementPurchaseCount,
    }}>
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error("useCustomers must be used within CustomersProvider");
  return ctx;
}
