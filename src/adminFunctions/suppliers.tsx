import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { suppliers as suppliersApi } from "@/adminFunctions/api";

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  totalDebt?: number;
  notes?: string;
}

interface SuppliersContextType {
  suppliers: Supplier[];
  addSupplier: (s: Omit<Supplier, "id">) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => { success: boolean; error?: string };
  recordDebt: (id: string | null, amount: number) => void;
}

const SuppliersContext = createContext<SuppliersContextType | undefined>(undefined);
export function SuppliersProvider({ children }: { children: ReactNode }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await suppliersApi.getAll() as Supplier[];
      if (data) setSuppliers(data);
    } catch {}
  }

  const addSupplier = async (s: Omit<Supplier, "id">) => {
    const id = Date.now().toString();
    setSuppliers(prev => [...prev, { ...s, id }]);
    try {
      const saved = await suppliersApi.create({ ...s, clientId: id }) as Supplier;
      await load();
      return saved;
    } catch {}
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    try { await suppliersApi.update(id, updates); } catch {}
  };

  const deleteSupplier = (id: string): { success: boolean; error?: string } => {
    try {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      suppliersApi.delete(id).catch(() => {});
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "تعذر الحذف" };
    }
  };

  const recordDebt = (id: string | null, amount: number) => {
    if (!id) return;
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, totalDebt: (s.totalDebt || 0) + amount } : s));
  };

  return (
    <SuppliersContext.Provider value={{ suppliers, addSupplier, updateSupplier, deleteSupplier, recordDebt }}>
      {children}
    </SuppliersContext.Provider>
  );
}

export function useSuppliers() {
  const ctx = useContext(SuppliersContext);
  if (!ctx) throw new Error("useSuppliers must be used within SuppliersProvider");
  return ctx;
}
