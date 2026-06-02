import React, { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye, FileText, Calendar } from "lucide-react";
import { Product } from "@/adminFunctions/products";
import { PurchaseInvoice, canCancelPurchaseInvoice } from "@/adminFunctions/purchases";
import { useBatches } from "@/adminFunctions/batches";
import { iteratePurchaseVariants } from "@/adminFunctions/variantStock";
import { calcPurchaseItemsMargin } from "@/adminFunctions/margins";
import { Input, Badge } from "./dashboard-ui";
import { toast } from "sonner";
import { useSuppliers } from "@/adminFunctions/suppliers";

interface PurchasesTabProps {
  products: Product[];
  purchases: PurchaseInvoice[];
  openPurchaseModal: (purchase?: PurchaseInvoice) => void;
  openInvoiceView: (purchase: PurchaseInvoice) => void;
  cancelPurchase: (id: string) => { success: boolean; error?: string };
}

export default function PurchasesTab({ products, purchases, openPurchaseModal, openInvoiceView, cancelPurchase }: PurchasesTabProps) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const { suppliers } = useSuppliers();
  const { batches } = useBatches();

  const filteredPurchases = purchases.filter(p => {
    if (!showArchived && p.status === "Cancelled") return false;
    if (dateFilter.start && new Date(p.date) < new Date(dateFilter.start)) return false;
    if (dateFilter.end && new Date(p.date) > new Date(dateFilter.end + "T23:59:59")) return false;
    const prodNames = p.items.map(i => {
      const prod = products.find(prod => prod.id === i.productId);
      return prod ? prod.name : "";
    }).join(" ");
    const matchesSearch =
      !search.trim() ||
      prodNames.includes(search) ||
      p.date.includes(search) ||
      (p.invoiceNumber && p.invoiceNumber.includes(search)) ||
      (p.notes && p.notes.includes(search));
    return matchesSearch;
  });

  const handleCancel = (p: PurchaseInvoice) => {
    if (window.confirm(`هل أنت متأكد من إلغاء الفاتورة ${p.invoiceNumber}؟ سيتم أرشفة دفعات المخزون الناتجة عنها.`)) {
      const result = cancelPurchase(p.id);
      if (result.success) {
        toast.success("تم إلغاء الفاتورة وأرشفة الدفعات بنجاح");
      } else {
        toast.error(result.error || "فشل إلغاء الفاتورة");
      }
    }
  };

  const handleEdit = (p: PurchaseInvoice) => {
    openPurchaseModal(p);
  };

  return (
    <div className="dashboard-page text-right" dir="rtl">
      <header className="dashboard-page-header">
        <div>
          <h1 className="dash-page-title">المشتريات</h1>
          <p className="dash-caption mt-1">فواتير الموردين</p>
        </div>
        <button type="button" onClick={() => openPurchaseModal()} className="dashboard-btn-accent">
          <Plus className="h-5 w-5" />
          فاتورة جديدة
        </button>
      </header>

      <div className="dashboard-card space-y-4">
        <div className="relative w-full">
          <Input placeholder="ابحث برقم الفاتورة أو اسم المنتج..." value={search} onChange={e => setSearch(e.target.value)} className="h-12 w-full pr-10 text-right font-bold text-sm bg-muted border-border" />
          <Search className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">من تاريخ</label>
            <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 h-11">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={dateFilter.start}
                onChange={e => {
                  const val = e.target.value;
                  setDateFilter((prev) => ({
                    start: val,
                    end: prev.end && val > prev.end ? val : prev.end,
                  }));
                }}
                className="w-full bg-transparent text-sm font-bold outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">إلى تاريخ</label>
            <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 h-11">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={dateFilter.end}
                onChange={e => {
                  const val = e.target.value;
                  setDateFilter((prev) => ({
                    end: val,
                    start: prev.start && val < prev.start ? val : prev.start,
                  }));
                }}
                className="w-full bg-transparent text-sm font-bold outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 h-11">
            <input type="checkbox" id="showArchived" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="w-4 h-4 text-primary rounded focus:ring-ring" />
            <label htmlFor="showArchived" className="text-sm font-bold text-muted-foreground cursor-pointer">عرض الملغاة</label>
          </div>
          {(dateFilter.start || dateFilter.end) && (
            <button
              type="button"
              onClick={() => setDateFilter({ start: "", end: "" })}
              className="h-11 text-sm font-bold text-red-500 hover:text-red-600 hover:underline"
            >
              إعادة تعيين التاريخ
            </button>
          )}
        </div>
      </div>

      {filteredPurchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-2xl border border-border border-dashed">
          <FileText className="h-16 w-16 mb-4 opacity-20" />
          <p className="font-bold">لا توجد فواتير مشتريات مطابقة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPurchases.map(p => {
            const date = new Date(p.date).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' });
            const totalQty = p.items.reduce(
              (sum, item) =>
                sum +
                iteratePurchaseVariants(item).reduce(
                  (a, v) => a + v.data.quantity,
                  0,
                ),
              0,
            );
            const isCancelled = p.status === "Cancelled";
            const allowCancel = canCancelPurchaseInvoice(p, batches);
            const margin = calcPurchaseItemsMargin(p.items);
            const supplier = suppliers.find(s => s.id === p.supplierId);

            return (
              <div key={p.id} className={`bg-card rounded-2xl border ${isCancelled ? 'border-destructive/30 opacity-60' : 'border-border hover:border-accent/40 hover:shadow-md'} transition-all overflow-hidden flex flex-col`}>
                <div className={`p-4 border-b flex justify-between items-center ${isCancelled ? 'bg-destructive/10' : 'bg-muted'}`}>
                  <div className="flex items-center gap-2">
                    <FileText className={`h-5 w-5 ${isCancelled ? 'text-destructive' : 'text-primary'}`} />
                    <div className="flex flex-col">
                      <span className="font-sans font-black text-sm text-foreground">{p.invoiceNumber}</span>
                      {p.notes && <span className="text-xs text-muted-foreground font-bold">{p.notes}</span>}
                    </div>
                  </div>
                  {isCancelled && (
                    <Badge className="bg-red-100 text-red-700">
                      ملغاة
                    </Badge>
                  )}
                </div>
                
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground">التاريخ:</span>
                    <span className="text-sm font-bold text-foreground">{date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground">المورد:</span>
                    <span className="text-sm font-black text-foreground">{supplier?.name || "مورد محذوف"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground">إجمالي القطع:</span>
                    <span className="text-sm font-bold font-sans text-foreground">{totalQty} قطعة</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground">ربح/خسارة متوقعة:</span>
                    <span
                      className={`text-sm font-black font-sans ${
                        margin.isLoss ? "text-destructive" : "text-emerald-600"
                      }`}
                    >
                      {margin.totalRevenue > 0 || margin.totalCost > 0
                        ? margin.isLoss
                          ? `خسارة ${Math.abs(margin.profit).toLocaleString()}`
                          : `+${margin.profit.toLocaleString()}`
                        : "—"}
                      {" "}دج
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="text-xs font-bold text-muted-foreground">الإجمالي:</span>
                    <span className="text-lg font-black font-sans text-primary">{p.totalAmount.toLocaleString()} دج</span>
                  </div>
                </div>

                <div className="p-3 border-t bg-muted flex justify-between gap-2">
                  <button 
                    onClick={() => openInvoiceView(p)} 
                    className="flex-1 bg-card border border-border text-foreground px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-secondary hover:text-primary transition-colors text-sm"
                  >
                    <Eye className="h-4 w-4" /> عرض الفاتورة
                  </button>
                  {!isCancelled && (
                    <>
                      <button 
                        onClick={() => handleEdit(p)} 
                        className="bg-card border border-accent/25 text-accent px-3 py-2 rounded-xl font-bold flex items-center justify-center hover:bg-accent/10 transition-colors text-sm"
                        title="تعديل الفاتورة"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {allowCancel ? (
                        <button
                          type="button"
                          onClick={() => handleCancel(p)}
                          className="bg-card border border-destructive/20 text-destructive px-3 py-2 rounded-xl font-bold flex items-center justify-center hover:bg-destructive/10 transition-colors text-sm"
                          title="إلغاء الفاتورة (لم يُبَع منها شيء)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span
                          className="px-2 py-2 text-[10px] font-bold text-muted-foreground text-center leading-tight max-w-[72px]"
                          title="لا يمكن الإلغاء: تم بيع قطع من هذه الفاتورة — التعديل متاح"
                        >
                          مبيعة جزئياً
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
