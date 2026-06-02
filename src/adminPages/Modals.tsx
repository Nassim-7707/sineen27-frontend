import React from "react";
import { X, Save, Trash2 } from "lucide-react";
import InvoicePrintShell, {
  PurchaseInvoiceDocument,
  SalesInvoiceDocument,
} from "./Invoice";
import { Badge, Input, ModalShell, DashSelect } from "./dashboard-ui";
import ImageUploadField from "./ImageUploadField";
import { Product } from "@/adminFunctions/products";
import { Order, OrderStatus, ORDER_STATUS_LABELS } from "@/adminFunctions/orders";
import { useOrders } from "@/adminFunctions/orders";
import {
  formatAlgerianPhoneInput,
  formatPercentInput,
  validateColorName,
  getTodayDateInputValue,
  clampDateToToday,
  blockNonNumericKeys,
} from "@/adminFunctions/validation";
import { toast } from "sonner";
import { useBatches } from "@/adminFunctions/batches";
import { useSuppliers } from "@/adminFunctions/suppliers";
import { PurchaseInvoice, usePurchases } from "@/adminFunctions/purchases";
import {
  calcPurchaseTotal,
  ensureVariantMatrix,
  hydratePurchaseLineDraft,
  buildPurchaseEditDraft,
  editPaletteAndSizes,
  productColors,
  type PurchaseLineDraft,
} from "@/adminFunctions/variantStock";
import VariantEntryGrid from "./VariantEntryGrid";
import {
  calcPurchaseItemsMargin,
  formatMarginLabel,
  getLowestPurchasePriceForProduct,
  priceAfterDiscount,
  wouldDiscountCauseLoss,
} from "@/adminFunctions/margins";

const ONLINE_ORDER_STATUSES: OrderStatus[] = ["قيد التحضير", "مكتمل", "تم التسليم", "ملغى"];

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  formData: Partial<Product>;
  setFormData: (v: any) => void;
  onSave: (e: React.FormEvent) => void;
  categorySizes: Record<string, string[]>;
  categories: string[];
  onOpenInvoice?: (invoice: any) => void;
}

export function ProductModal({
  isOpen, onClose, editingProduct, formData, setFormData, onSave, categorySizes, categories, onOpenInvoice
}: ProductModalProps) {
  const { getProductStockBySize, getLowestSellingPriceBySize, getLowestSellingPrice, batches } = useBatches();
  const { purchases } = usePurchases();
  const { suppliers } = useSuppliers();

  const relevantSizes = categorySizes[formData.category || categories[0]] || [];
  const productBatches = editingProduct ? batches.filter(b => b.productId === editingProduct.id).sort((a, b) => new Date(b.receiveDate).getTime() - new Date(a.receiveDate).getTime()) : [];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? "تعديل قطعة" : "إضافة قطعة جديدة"}
      subtitle="تعريف المنتج فقط — الكميات والأسعار تُضاف من صفحة المشتريات"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={onSave} className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto scrollbar-hide text-right" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block text-right">
                اسم المنتج <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="h-12 text-right"
                required
                maxLength={120}
                placeholder="مثال: عباءة شيهانة"
              />
            </div>

            <ImageUploadField
              value={formData.image}
              onChange={(url) => setFormData({ ...formData, image: url })}
              onClear={() => setFormData({ ...formData, image: "" })}
            />

            {/* Category */}
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block text-right">نوع المنتج (الفئة)</label>
              <select className="w-full h-12 border border-border rounded-xl px-4 font-bold text-right outline-none focus:border-ring" value={formData.category || categories[0] || ""} onChange={e => setFormData({ ...formData, category: e.target.value })} required>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Discount Percent */}
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block text-right">نسبة الخصم (%)</label>
              <Input
                type="text"
                inputMode="numeric"
                className="w-full h-12 border border-border rounded-xl px-4 font-bold text-right outline-none focus:border-ring font-sans"
                value={formData.discountPercent ?? 0}
                onKeyDown={blockNonNumericKeys}
                onChange={e => {
                  const pct = parseInt(formatPercentInput(e.target.value) || "0", 10);
                  setFormData({ ...formData, discountPercent: pct });
                  if (editingProduct) {
                    const sell = getLowestSellingPrice(editingProduct.id);
                    const cost = getLowestPurchasePriceForProduct(editingProduct.id, batches);
                    if (wouldDiscountCauseLoss(sell, pct, cost)) {
                      const after = priceAfterDiscount(sell, pct);
                      toast.warning("تنبيه: الخصم قد يسبب خسارة", {
                        description: `سعر البيع بعد الخصم (${after.toLocaleString()} دج) أقل من أدنى تكلفة شراء (${cost.toLocaleString()} دج)`,
                      });
                    }
                  }
                }}
                placeholder="0–100"
              />
              {editingProduct && (() => {
                const sell = getLowestSellingPrice(editingProduct.id);
                const cost = getLowestPurchasePriceForProduct(editingProduct.id, batches);
                const pct = formData.discountPercent ?? 0;
                if (sell <= 0 || cost <= 0) return null;
                const after = priceAfterDiscount(sell, pct);
                const loss = after < cost;
                return (
                  <p className={`text-[11px] font-bold mt-2 ${loss ? "text-destructive" : "text-emerald-600"}`}>
                    {loss
                      ? `⚠ بعد الخصم: ${after.toLocaleString()} دج — أقل من التكلفة (${cost.toLocaleString()} دج)`
                      : `بعد الخصم: ${after.toLocaleString()} دج — التكلفة: ${cost.toLocaleString()} دج`}
                  </p>
                );
              })()}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block text-right">الوصف (اختياري)</label>
              <textarea className="w-full p-4 border border-border rounded-xl text-right font-medium outline-none focus:border-ring resize-none h-24" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value.slice(0, 500) })} placeholder="أضف وصفاً للمنتج..." maxLength={500} />
            </div>

            {/* Colors */}
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block text-right">
                الألوان <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3 justify-end items-center">
                {(formData.colors || []).map(color => (
                  <Badge key={color} className="bg-muted text-black border-0 py-2 px-3 flex items-center gap-2 rounded-lg">
                    <button type="button" onClick={() => setFormData({ ...formData, colors: (formData.colors || []).filter(c => c !== color) })}><X className="h-3 w-3" /></button>
                    {color}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 flex-row-reverse">
                <Input placeholder="إضافة لون..." id="new-color-input" className="h-10 text-right" />
                <button type="button" onClick={() => {
                  const input = document.getElementById('new-color-input') as HTMLInputElement;
                  const check = validateColorName(input.value);
                  if (!check.valid) return;
                  const val = input.value.trim();
                  if (!(formData.colors || []).includes(val)) {
                    setFormData({ ...formData, colors: [...(formData.colors || []), val] });
                    input.value = "";
                  }
                }} className="bg-primary text-white px-4 rounded-lg hover:bg-primary/90 transition-all font-bold">أضف</button>
              </div>
            </div>
          </div>

          {/* Right Column: Sizes and Batches Details */}
          <div className="space-y-6">
            <label className="text-xs font-bold text-muted-foreground mb-4 block uppercase text-center">المقاسات المتاحة</label>
            {relevantSizes.length === 0 && <span className="text-[10px] text-red-500 w-full text-center block">لا توجد مقاسات مضافة لهذا النوع من المنتجات — أضفها من صفحة الفلاتر</span>}
            <div className="space-y-3">
              {relevantSizes.map(s => {
                const isStd = String(s || '').toLowerCase().startsWith('standard') || String(s || '').toLowerCase().startsWith('stander');
                const sizeLabel = isStd ? 'القياسي' : `مقاس ${s}`;
                const stockBySize = editingProduct ? getProductStockBySize(editingProduct.id, s) : 0;
                const priceBySize = editingProduct ? getLowestSellingPriceBySize(editingProduct.id, s) : 0;
                return (
                  <div key={s} className="bg-card p-4 rounded-2xl border border-border">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <span className="text-sm font-bold">{sizeLabel}</span>
                      {editingProduct && (
                        <div className="flex items-center gap-3">

                          <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-lg">
                            <span className="text-[10px] text-muted-foreground font-bold">المخزون:</span>
                            <span className={`font-black font-sans text-xs ${stockBySize > 5 ? 'text-emerald-600' : stockBySize > 0 ? 'text-gold' : 'text-red-500'}`}>{stockBySize}</span>
                          </div>
                        </div>
                      )}
                      {!editingProduct && (
                        <span className="text-[10px] text-warm-gray font-bold">سيتاح إدخال الكمية لاحقاً</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {editingProduct && (
              <div className="mt-8 space-y-3 border-t border-border pt-6">
                <label className="text-xs font-bold text-muted-foreground block uppercase text-center">سجل المشتريات والدفعات لهذا المنتج</label>
                {productBatches.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-4 bg-muted rounded-xl border border-dashed border-border">
                    لا يوجد سجل مشتريات
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-y-auto max-h-[200px] custom-scrollbar">
                    <table className="w-full text-[10px] text-right">
                      <thead>
                        <tr className="bg-muted text-muted-foreground">
                          <th className="p-2 font-bold">الفاتورة / المورد</th>
                          <th className="p-2 font-bold">الشحنة / التاريخ</th>
                          <th className="p-2 font-bold">الأسعار</th>
                          <th className="p-2 font-bold">الحالة والمخزون</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productBatches.map(batch => {
                          const remaining = Object.values(batch.remainingQuantities).reduce((a, b) => a + b, 0);
                          const initial = Object.values(batch.initialQuantities).reduce((a, b) => a + b, 0);
                          const invoice = purchases.find(p => p.id === batch.purchaseInvoiceId);
                          const supplier = suppliers.find(s => s.id === batch.supplierId);

                          return (
                            <tr key={batch.id} className={`border-t border-border ${batch.status === 'archived' ? 'bg-red-50/50 opacity-60' : 'bg-card'}`}>
                              <td className="p-2 font-sans font-bold">
                                {invoice ? (
                                  <button type="button" onClick={() => onOpenInvoice && onOpenInvoice(invoice)} className="text-primary hover:underline">{invoice.invoiceNumber}</button>
                                ) : (
                                  <div className="text-primary">بدون فاتورة</div>
                                )}
                                <div className="text-muted-foreground font-normal">{supplier?.name || "مورد غير معروف"}</div>
                              </td>
                              <td className="p-2 font-sans">
                                <div className="font-bold text-foreground">{batch.batchNumber}</div>
                                <div className="text-muted-foreground">{new Date(batch.receiveDate).toLocaleDateString('ar-DZ')}</div>
                              </td>
                              <td className="p-2 font-sans font-bold">
                                <div className="text-muted-foreground">ش: {batch.purchasePrice.toLocaleString()}</div>
                                <div className="text-emerald-600">ب: {batch.suggestedSellingPrice.toLocaleString()}</div>
                              </td>
                              <td className="p-2 font-sans font-black text-xs">
                                {batch.status === 'archived' ? (
                                  <span className="text-red-500 text-[10px] font-normal px-2 py-0.5 bg-red-100 rounded-full">ملغاة</span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className={remaining > 0 ? "text-emerald-600" : "text-red-500"}>{remaining}</span>
                                    <span className="text-muted-foreground font-normal text-[10px]">/ {initial}</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!editingProduct && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-xs text-primary font-bold text-center">
                لتعديل الكميات أو الأسعار، استخدم صفحة المشتريات لإضافة شحنة جديدة
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button type="submit" className="bg-charcoal text-white w-full max-w-sm h-14 rounded-2xl text-lg font-bold hover:bg-primary transition-all flex items-center justify-center gap-3 mr-auto"><Save className="h-5 w-5" /> حفظ المنتج</button>
        </div>
      </form>
    </ModalShell>
  );
}

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Partial<Order> | null;
  editData: Partial<Order>;
  setEditData: (v: any) => void;
  onSave: () => void;
  products: Product[];
  addItem: (p: Product, s: string) => void;
  removeItem: (idx: number) => void;
}

export function OrderModal({
  isOpen, onClose, order, editData, setEditData, onSave, products, addItem, removeItem
}: OrderModalProps) {
  const isEditing = !!order?.id;
  const { wilayaFees, wilayaCommunes } = useOrders();
  const wilayaList = Object.keys(wilayaFees).sort();

  const syncTotals = (
    items: NonNullable<typeof editData.items>,
    wilayaOverride?: string,
  ) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const isOnline = editData.isOnlineOrder !== false;
    const wilaya = wilayaOverride ?? editData.customerWilaya ?? wilayaList[0] ?? "";
    const delivery = isOnline ? (wilayaFees[wilaya] ?? 0) : 0;
    const total = subtotal + delivery;
    setEditData({
      ...editData,
      items,
      subtotal,
      deliveryFee: delivery,
      totalAmount: total,
      totalDZD: total,
    });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `تعديل طلبية #${order.id}` : "طلبية جديدة"}
      maxWidth="max-w-5xl"
      tall
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 text-right" dir="rtl">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-foreground border-b pb-2 text-sm italic">بيانات العميل</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-muted-foreground">الاسم *</label><Input value={editData.customerName} onChange={e => setEditData({ ...editData, customerName: e.target.value.replace(/[^\u0600-\u06FFa-zA-Z\s.'-]/g, "").slice(0, 60) })} className="h-12 font-bold text-right" maxLength={60} /></div>
              <div><label className="text-xs font-bold text-muted-foreground">الهاتف *</label><Input type="tel" inputMode="numeric" value={editData.customerPhone} onChange={e => setEditData({ ...editData, customerPhone: formatAlgerianPhoneInput(e.target.value) })} className="h-12 font-sans font-bold text-right" maxLength={10} placeholder="0555123456" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground">الولاية</label>
                <select
                  className="w-full h-12 border border-border rounded-xl px-4 font-bold text-right outline-none focus:border-ring"
                  value={editData.customerWilaya || wilayaList[0] || ""}
                  onChange={(e) => {
                    const w = e.target.value;
                    const communes = wilayaCommunes[w] || [];
                    const items = editData.items || [];
                    const subtotal = items.reduce(
                      (s, i) => s + i.price * i.quantity,
                      0,
                    );
                    const delivery = wilayaFees[w] ?? 0;
                    setEditData({
                      ...editData,
                      customerWilaya: w,
                      customerAddress: communes[0] || "",
                      subtotal,
                      deliveryFee: delivery,
                      totalAmount: subtotal + delivery,
                      totalDZD: subtotal + delivery,
                    });
                  }}
                >
                  {wilayaList.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">البلدية</label>
                <select
                  className="w-full h-12 border border-border rounded-xl px-4 font-bold text-right outline-none focus:border-ring"
                  value={editData.customerAddress || ""}
                  onChange={(e) => setEditData({ ...editData, customerAddress: e.target.value })}
                >
                  {(wilayaCommunes[editData.customerWilaya || ""] || []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {editData.isOnlineOrder !== false && (
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block">حالة الطلب (موقع)</label>
              <select
                className="w-full h-12 border border-border rounded-xl px-4 font-bold text-right outline-none focus:border-ring"
                value={editData.status || "قيد التحضير"}
                onChange={(e) =>
                  setEditData({ ...editData, status: e.target.value as OrderStatus })
                }
              >
                {ONLINE_ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-bold text-foreground border-b pb-2 text-sm italic">السلع المطلوبة</h3>
            {editData.items?.length === 0 && (
              <p className="text-xs text-muted-foreground font-bold py-4 text-center">لا توجد منتجات — أضف من القائمة على اليمين</p>
            )}
            {editData.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-muted rounded-xl border gap-2">
                <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="h-4 w-4" /></button>
                <div className="text-right flex-1 px-2 min-w-0">
                  <p className="font-bold text-xs">{item.productName}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{item.size && !item.size.toLowerCase().startsWith('standard') && !item.size.toLowerCase().startsWith('stander') ? `مقاس ${item.size} • ` : ''}{item.price.toLocaleString()} دج</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    className="h-7 w-7 rounded-lg bg-card border text-xs font-bold"
                    onClick={() => {
                      const items = [...(editData.items || [])];
                      if (items[idx].quantity <= 1) removeItem(idx);
                      else {
                        items[idx] = { ...items[idx], quantity: items[idx].quantity - 1 };
                        syncTotals(items);
                      }
                    }}
                  >−</button>
                  <span className="font-bold text-sm font-sans w-6 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    className="h-7 w-7 rounded-lg bg-card border text-xs font-bold"
                    onClick={() => {
                      const items = [...(editData.items || [])];
                      items[idx] = { ...items[idx], quantity: items[idx].quantity + 1 };
                      syncTotals(items);
                    }}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6 bg-muted/50 p-6 rounded-2xl border">
          <h3 className="font-bold text-foreground border-b pb-2 text-sm italic text-center">إضافة المزيد</h3>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
            {products.map(p => (
              <div key={p.id} className="p-3 bg-card rounded-xl border flex justify-between items-center shadow-sm">
                <div className="flex gap-1">
                  {(p.sizes || []).map(s => (
                    <button key={s} onClick={() => addItem(p, s)} className="px-2 py-1 bg-muted hover:bg-primary hover:text-white rounded-lg text-[9px] font-bold transition-colors">{s}</button>
                  ))}
                </div>
                <p className="font-bold text-xs text-right">{p.name}</p>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t space-y-4 text-sm">
            <div className="flex justify-between font-bold">
              <span className="font-sans">{(editData.subtotal ?? 0).toLocaleString()} دج</span>
              <span>المجموع الفرعي:</span>
            </div>
            {editData.isOnlineOrder !== false && (
              <div className="flex justify-between font-bold text-muted-foreground">
                <span className="font-sans">{(editData.deliveryFee ?? 0).toLocaleString()} دج</span>
                <span>التوصيل:</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span className="font-sans">{(editData.totalAmount || editData.totalDZD || 0).toLocaleString()} دج</span>
              <span>الإجمالي:</span>
            </div>
            <button onClick={onSave} className="bg-primary text-white w-full h-14 rounded-xl font-bold hover:bg-primary/90 shadow-md flex items-center justify-center gap-3"><Save className="h-5 w-5" /> حفظ الطلبية</button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export function InvoiceModal({ isOpen, onClose, order }: InvoiceModalProps) {
  if (!isOpen || !order) return null;

  return (
    <InvoicePrintShell isOpen={isOpen} onClose={onClose} title="فاتورة بيع">
      <SalesInvoiceDocument order={order} />
    </InvoicePrintShell>
  );
}

export interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categorySizes: Record<string, string[]>;
  editingPurchase: Partial<any> | null;
  purchaseData: Partial<any>;
  setPurchaseData: (v: any) => void;
  onSave: (e: React.FormEvent) => void;
  getVariantMinQty?: (productId: string) => Record<string, number>;
}

export function PurchaseModal({ isOpen, onClose, products, categorySizes, editingPurchase, purchaseData, setPurchaseData, onSave, getVariantMinQty }: PurchaseModalProps) {
  const [selectedGroup, setSelectedGroup] = React.useState<string>("");
  const [selectedProductStr, setSelectedProductStr] = React.useState<string>("");
  const { suppliers } = useSuppliers();

  const purchaseMargin = React.useMemo(
    () => calcPurchaseItemsMargin((purchaseData.items || []) as PurchaseLineDraft[]),
    [purchaseData.items],
  );

  const availableProducts = selectedGroup ? products.filter(p => p.category === selectedGroup) : products;
  const groups = Array.from(new Set(products.map(p => p.category)));

  const syncTotals = (items: PurchaseLineDraft[]) => {
    const total = calcPurchaseTotal(items);
    setPurchaseData((prev) => ({
      ...prev,
      items,
      totalAmount: total,
      paidAmount: editingPurchase ? (prev.paidAmount ?? total) : total,
    }));
  };

  const handleAddItem = (productId: string) => {
    if (!productId) return;
    const p = products.find(x => x.id === productId);
    if (!p) return;

    const existingItems = (purchaseData.items || []) as PurchaseLineDraft[];
    if (existingItems.find((i) => i.productId === p.id)) {
      toast.error("المنتج مضاف بالفعل للفاتورة");
      return;
    }

    const palette = productColors(p.colors);
    if (palette.length === 1 && palette[0] === "افتراضي" && !(p.colors || []).length) {
      toast.warning("أضف ألواناً للمنتج أولاً من صفحة المنتجات لتنظيم المخزون");
    }

    const relSizes = [
      ...new Set([...(p.sizes || []), ...(categorySizes[p.category] || [])]),
    ];
    let newItem = hydratePurchaseLineDraft(
      { productId: p.id, productName: p.name, colors: {} },
      palette,
    );
    newItem = ensureVariantMatrix(newItem, palette, relSizes);
    syncTotals([...existingItems, newItem]);
    setSelectedProductStr("");
  };

  const updateItem = (productId: string, nextItem: PurchaseLineDraft) => {
    const items = ((purchaseData.items || []) as PurchaseLineDraft[]).map((i) =>
      i.productId === productId ? nextItem : i,
    );
    syncTotals(items);
  };

  const removeItem = (productId: string) => {
    const mins = getVariantMinQty?.(productId);
    if (mins && Object.values(mins).some((n) => n > 0)) {
      toast.error("لا يمكن حذف المنتج: تم بيع قطع من هذه الفاتورة");
      return;
    }
    const items = ((purchaseData.items || []) as PurchaseLineDraft[]).filter(
      (i) => i.productId !== productId,
    );
    syncTotals(items);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={editingPurchase ? "تعديل فاتورة مشتريات" : "إضافة فاتورة مشتريات و استلام شحنة"}
      maxWidth="max-w-5xl"
      mobileSheet={false}
    >
      <form onSubmit={onSave} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide text-right" dir="rtl">

        {/* General Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">تاريخ الشراء</label>
            <Input
              type="date"
              max={getTodayDateInputValue()}
              value={purchaseData.date ? purchaseData.date.split("T")[0] : ""}
              onChange={(e) =>
                setPurchaseData({
                  ...purchaseData,
                  date: clampDateToToday(e.target.value),
                })
              }
              className="h-12 font-sans text-right"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block text-right">اسم / ملاحظة الفاتورة</label>
            <Input type="text" placeholder="مثال: فاتورة سلع رمضان..." value={purchaseData.notes || ""} onChange={e => setPurchaseData({ ...purchaseData, notes: e.target.value })} className="h-12 text-right" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block text-right">المورد <span className="text-destructive">*</span></label>
            <DashSelect
              value={purchaseData.supplierId || ""}
              onChange={e => setPurchaseData({ ...purchaseData, supplierId: e.target.value })}
              required
            >
              <option value="">اختر المورد...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.phone ? ` (${s.phone})` : ""}</option>
              ))}
            </DashSelect>
            {suppliers.length === 0 && (
              <p className="dash-caption mt-2 text-accent">
                لا يوجد موردون — أضفهم من الإعدادات ثم أنشئ الفاتورة.
              </p>
            )}
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-muted p-6 rounded-xl border border-border">
          <label className="text-sm font-bold text-foreground mb-3 block text-right">أضف منتجات للفاتورة</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block">فلتر حسب المجموعة (الفئة)</label>
              <select className="w-full h-12 border border-border rounded-xl px-4 font-bold text-right outline-none focus:border-ring" value={selectedGroup} onChange={e => { setSelectedGroup(e.target.value); setSelectedProductStr(""); }}>
                <option value="">كل المجموعات</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block">اختر المنتج (يضاف تلقائياً)</label>
              <select className="w-full h-12 border border-border rounded-xl px-4 font-bold text-right outline-none focus:border-ring" value={selectedProductStr} onChange={e => {
                setSelectedProductStr(e.target.value);
                handleAddItem(e.target.value);
              }}>
                <option value="">اختر المنتج...</option>
                {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {(purchaseData.items || []).length > 0 && (
          <div className="space-y-6">
            <h3 className="font-bold text-foreground text-lg">جدول الإدخال السريع (لون × مقاس)</h3>
            {((purchaseData.items || []) as PurchaseLineDraft[]).map((rawItem, idx) => {
              const product = products.find((p) => p.id === rawItem.productId);
              const item = buildPurchaseEditDraft(
                rawItem,
                product,
                categorySizes,
              );
              const { palette, sizes: relSizes } = editPaletteAndSizes(
                item,
                product,
                categorySizes,
              );

              return (
                <div
                  key={rawItem.productId || idx}
                  className="bg-card p-5 sm:p-6 rounded-2xl border-2 border-border relative shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="absolute top-5 left-5 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <h4 className="font-black text-lg mb-4 pr-3 border-r-4 border-accent">
                    {item.productName}
                  </h4>
                  <VariantEntryGrid
                    item={item}
                    colors={palette}
                    sizes={relSizes}
                    minQuantities={getVariantMinQty?.(item.productId)}
                    onChange={(next) => updateItem(item.productId, next)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Payment Details */}
        {(purchaseData.items || []).length > 0 && (
          <div className="bg-primary p-6 rounded-xl border border-border space-y-4 text-white shadow-xl">
            <h3 className="font-bold border-b border-border pb-2">معلومات الدفع والربح</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-charcoal/80 rounded-xl p-3 border border-border">
                <span className="text-warm-gray text-xs font-bold block mb-1">تكلفة الشراء</span>
                <span className="font-black font-sans text-lg">{purchaseMargin.totalCost.toLocaleString()} دج</span>
              </div>
              <div className="bg-charcoal/80 rounded-xl p-3 border border-border">
                <span className="text-warm-gray text-xs font-bold block mb-1">إيراد البيع المتوقع</span>
                <span className="font-black font-sans text-lg">{purchaseMargin.totalRevenue.toLocaleString()} دج</span>
              </div>
            </div>
            <div
              className={`rounded-xl p-4 border-2 ${purchaseMargin.isLoss
                  ? "border-destructive bg-destructive/15"
                  : "border-emerald-500/40 bg-emerald-500/10"
                }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="font-bold">
                  {purchaseMargin.isLoss ? "⚠ خسارة متوقعة" : "✓ ربح متوقع"}
                </span>
                <span
                  className={`font-black font-sans text-xl ${purchaseMargin.isLoss ? "text-red-300" : "text-emerald-300"
                    }`}
                >
                  {formatMarginLabel(purchaseMargin)}
                </span>
              </div>
              {purchaseMargin.totalRevenue > 0 && (
                <p className="text-xs text-warm-gray mt-2">
                  هامش الربح: {purchaseMargin.marginPercent}%
                </p>
              )}
            </div>
            <div className="w-full">
              <label className="text-xs font-bold text-warm-gray mb-2 block text-right">إجمالي فاتورة الشراء (دج)</label>
              <div className="h-14 bg-charcoal rounded-xl border border-border flex items-center px-4 font-black font-sans text-2xl text-gold">
                {(purchaseData.totalAmount || 0).toLocaleString()} دج
              </div>
            </div>
          </div>
        )}

        <button disabled={(purchaseData.items || []).length === 0} type="submit" className="bg-primary disabled:opacity-50 text-white w-full h-16 rounded-2xl text-xl font-black hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 mt-8"><Save className="h-6 w-6" /> حفظ الفاتورة واستلام الدفعات</button>
      </form>
    </ModalShell>
  );
}

export interface PurchaseInvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseInvoice | null;
  products: Product[];
}

export function PurchaseInvoiceViewModal({ isOpen, onClose, purchase, products }: PurchaseInvoiceViewModalProps) {
  if (!isOpen || !purchase) return null;

  return (
    <InvoicePrintShell isOpen={isOpen} onClose={onClose} title="فاتورة مشتريات" maxWidthClass="max-w-3xl">
      <PurchaseInvoiceDocument purchase={purchase} products={products} />
    </InvoicePrintShell>
  );
}

