import { useState, useEffect } from "react";
import { Printer, Trash2, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Input, Badge } from "./dashboard-ui";
import { formatPercentInput, blockNonNumericKeys } from "@/adminFunctions/validation";
import { getProductImageSrc } from "@/adminFunctions/products";
import { Product } from "@/adminFunctions/products";
import { useBatches } from "@/adminFunctions/batches";
import { productColors } from "@/adminFunctions/variantStock";
import { isStandardSize, sizeLabel } from "@/adminFunctions/products";
import {
  PosCartItem,
  getPosCartQtyForVariant,
  getLineSubtotal,
  getPosCartSubtotal,
} from "@/adminFunctions/orders";
import { calcPosCartMargin, formatMarginLabel } from "@/adminFunctions/margins";

interface POSTabProps {
  posSearch: string;
  setPosSearch: (v: string) => void;
  filteredPosProducts: Product[];
  flippedProductId: string | null;
  setFlippedProductId: (id: string | null) => void;
  addToPosCart: (p: Product, size: string, color: string) => void;
  autoPrint: boolean;
  setAutoPrint: (v: boolean) => void;
  posCart: PosCartItem[];
  setPosCart: (v: PosCartItem[]) => void;
  updatePosCartQty: (idx: number, delta: number) => void;
  removeFromPosCart: (idx: number) => void;
  updateLineDiscount: (idx: number, amount: number) => void;
  processPosSale: () => void;
  editingOrder: { id: string; orderNumber?: string } | null;
  cancelEdit: () => void;
}

export default function POSTab({
  posSearch,
  setPosSearch,
  filteredPosProducts,
  flippedProductId,
  setFlippedProductId,
  addToPosCart,
  autoPrint,
  setAutoPrint,
  posCart,
  setPosCart,
  updatePosCartQty,
  removeFromPosCart,
  updateLineDiscount,
  processPosSale,
  editingOrder,
  cancelEdit,
}: POSTabProps) {
  const { getProductStockBySize, getLowestSellingPrice, getLowestSellingPriceBySize, batches } =
    useBatches();
  const [expandedDiscountIdx, setExpandedDiscountIdx] = useState<number | null>(null);
  const [pickColor, setPickColor] = useState<Record<string, string>>({});

  const cartSubtotal = getPosCartSubtotal(posCart);
  const cartMargin = calcPosCartMargin(posCart, batches);

  useEffect(() => {
    if (!flippedProductId) return;
    const p = filteredPosProducts.find((x) => x.id === flippedProductId);
    if (!p) return;
    const palette = productColors(p.colors);
    if (!pickColor[p.id] || !palette.includes(pickColor[p.id])) {
      setPickColor((prev) => ({ ...prev, [p.id]: palette[0] }));
    }
  }, [flippedProductId, filteredPosProducts, pickColor]);

  const getAvailable = (productId: string, size: string, color: string) => {
    const stock = getProductStockBySize(productId, size, color);
    const inCart = getPosCartQtyForVariant(posCart, productId, size, color);
    return Math.max(0, stock - inCart);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-grid-main-side">
        <div className="dashboard-col-main space-y-6">
          <header className="dashboard-card-flat flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <h1 className="dash-page-title text-xl sm:text-2xl">
                {editingOrder ? "تعديل طلب" : "نقطة البيع"}
              </h1>
              {editingOrder && (
                <Badge className="bg-accent/15 text-accent border-accent/25 font-bold px-3 py-1">
                  #{editingOrder.orderNumber || editingOrder.id}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              {editingOrder && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-xs font-bold text-destructive hover:underline"
                >
                  إلغاء التعديل
                </button>
              )}
              <Input
                placeholder="بحث عن منتج..."
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                className="saneen-input w-full md:w-80"
              />
            </div>
          </header>
          <div className="dashboard-grid-3 overflow-y-auto max-h-[70vh] pr-1">
            {filteredPosProducts.map((p) => {
              const palette = productColors(p.colors);
              const activeColor =
                pickColor[p.id] && palette.includes(pickColor[p.id])
                  ? pickColor[p.id]
                  : palette[0];
              const isFlipped = flippedProductId === p.id;

              return (
                <div
                  key={p.id}
                  className="dashboard-card-hover group cursor-pointer p-0 overflow-hidden"
                  onClick={() => setFlippedProductId(isFlipped ? null : p.id)}
                >
                  <div className="aspect-[4/5] relative bg-muted overflow-hidden">
                    {isFlipped ? (
                      <div
                        className="absolute inset-0 bg-card backdrop-blur-sm p-4 flex flex-col gap-3 overflow-y-auto border-2 border-primary/15 shadow-inner"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-[11px] font-bold text-foreground text-center leading-snug line-clamp-2">
                          {p.name}
                        </p>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {palette.map((c) => {
                            const hasStock = (p.sizes || []).some(
                              (s) => getProductStockBySize(p.id, s, c) > 0,
                            );
                            const isActive = activeColor === c;
                            const chipBase =
                              "px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all";
                            const chipClass = !hasStock
                              ? `${chipBase} bg-muted text-muted-foreground border-border line-through opacity-60 cursor-not-allowed`
                              : isActive
                                ? `${chipBase} bg-primary text-primary-foreground border-primary shadow-sm`
                                : `${chipBase} bg-secondary text-foreground border-border hover:border-primary/35 hover:bg-primary/5`;
                            return (
                              <button
                                key={c}
                                type="button"
                                disabled={!hasStock}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPickColor((prev) => ({ ...prev, [p.id]: c }));
                                }}
                                className={chipClass}
                              >
                                {c}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                          {(p.sizes || []).map((s) => {
                            const available = getAvailable(p.id, s, activeColor);
                            const isOOS = available <= 0;
                            const price =
                              getLowestSellingPriceBySize(p.id, s, activeColor) ||
                              getLowestSellingPrice(p.id) ||
                              0;
                            const sizeBase =
                              "h-10 text-[10px] font-bold rounded-xl px-2 border transition-colors";
                            const sizeClass = isOOS
                              ? `${sizeBase} bg-muted/70 text-muted-foreground border-border border-dashed line-through cursor-not-allowed`
                              : `${sizeBase} bg-primary/5 text-foreground border-primary/25 hover:bg-primary hover:text-primary-foreground hover:border-primary`;
                            return (
                              <button
                                key={`${activeColor}-${s}`}
                                type="button"
                                disabled={isOOS}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToPosCart(p, s, activeColor);
                                  setFlippedProductId(null);
                                }}
                                className={sizeClass}
                              >
                                {isOOS
                                  ? `${sizeLabel(s)} — غير متوفر`
                                  : `${sizeLabel(s)} · ${price.toLocaleString()} دج (${available})`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <img
                        src={getProductImageSrc(p.image)}
                        alt={p.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-4 flex justify-between items-center gap-2 bg-muted/30 border-t border-border/60">
                    <h4 className="font-bold text-xs truncate flex-1 text-foreground">{p.name}</h4>
                    <span className="text-xs font-black shrink-0 text-primary tabular-nums">
                      {(getLowestSellingPrice(p.id) || 0).toLocaleString()} دج
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-col-side">
          <div className="dashboard-card min-h-[400px] lg:min-h-[calc(100vh-120px)] flex flex-col lg:sticky lg:top-24 p-0 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border bg-muted flex flex-wrap justify-between items-center gap-3">
              <h3 className="dash-section-title">السلة</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setAutoPrint(!autoPrint);
                  }}
                  className={`h-8 px-3 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 ${
                    autoPrint
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Printer className="h-3 w-3" />
                  {autoPrint ? "طباعة مفعلة" : "طباعة متوقفة"}
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPosCart([])}
                  className="h-8 text-xs font-black"
                >
                  إفراغ
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {posCart.length === 0 && (
                <div className="dashboard-empty py-12">
                  <p className="dash-caption">السلة فارغة</p>
                </div>
              )}
              {posCart.map((item, idx) => {
                const lineColor = item.color || productColors(item.product.colors)[0] || "";
                const lineTotal = getLineSubtotal(item);
                const linePct = Math.min(100, Math.max(0, item.lineDiscount || 0));
                return (
                  <div
                    key={`${item.product.id}-${item.color}-${item.size}-${idx}`}
                    className="bg-card p-3 rounded-xl border border-border shadow-sm space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold leading-relaxed">
                          {item.product.name}
                        </h4>
                        <p className="text-[10px] font-bold text-accent mt-0.5">
                          {lineColor}
                          {item.size &&
                          !isStandardSize(item.size)
                            ? ` · ${sizeLabel(item.size)}`
                            : ""}
                        </p>
                        <p className="text-[11px] font-bold text-muted-foreground mt-1">
                          السعر:{" "}
                          <span className="font-sans text-primary">
                            {item.unitPrice.toLocaleString()} دج
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromPosCart(idx)}
                        className="text-destructive/50 hover:text-destructive p-1 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => updatePosCartQty(idx, -1)}
                          className="h-7 w-7 flex items-center justify-center bg-card rounded shadow-sm text-xs font-bold"
                        >
                          −
                        </button>
                        <span className="text-xs font-bold w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePosCartQty(idx, 1)}
                          className="h-7 w-7 flex items-center justify-center bg-card rounded shadow-sm text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-black text-accent">
                        {lineTotal.toLocaleString()} دج
                      </span>
                    </div>

                    <div className="border-t border-border pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDiscountIdx(
                            expandedDiscountIdx === idx ? null : idx,
                          )
                        }
                        className="flex items-center gap-1.5 text-[10px] font-bold text-gold hover:text-accent"
                      >
                        <Tag className="h-3 w-3" />
                        خصم %
                        {linePct > 0 && (
                          <span className="text-accent">(-{linePct}%)</span>
                        )}
                        {expandedDiscountIdx === idx ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                      {expandedDiscountIdx === idx && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.lineDiscount || ""}
                            onKeyDown={blockNonNumericKeys}
                            onChange={(e) => {
                              const pct = parseInt(
                                formatPercentInput(e.target.value) || "0",
                                10,
                              );
                              updateLineDiscount(idx, pct);
                            }}
                            placeholder="0"
                            className="flex-1 h-9 text-center text-sm font-bold font-sans border border-accent/30 rounded-lg bg-accent/10 outline-none focus:border-accent"
                          />
                          <span className="text-xs font-bold text-muted-foreground">
                            %
                          </span>
                          {item.lineDiscount > 0 && (
                            <button
                              type="button"
                              onClick={() => updateLineDiscount(idx, 0)}
                              className="text-[10px] font-bold text-destructive"
                            >
                              إلغاء
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="dashboard-pos-footer">
              {posCart.length > 0 && cartMargin.totalCost > 0 && (
                <div
                  className={`mb-3 p-3 rounded-xl border text-sm font-bold ${
                    cartMargin.isLoss
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  }`}
                >
                  <div className="flex justify-between">
                    <span>التكلفة</span>
                    <span className="font-sans">{cartMargin.totalCost.toLocaleString()} دج</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>{cartMargin.isLoss ? "خسارة متوقعة" : "ربح متوقع"}</span>
                    <span className="font-sans">{formatMarginLabel(cartMargin)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center text-xl font-black mb-4">
                <span>المجموع النهائي</span>
                <span className="text-gold">{cartSubtotal.toLocaleString()} دج</span>
              </div>

              <button
                type="button"
                onClick={processPosSale}
                disabled={posCart.length === 0}
                className={`saneen-btn-gold w-full h-14 sm:h-16 text-base sm:text-lg ${editingOrder ? "gold-gradient" : ""}`}
              >
                <Printer className="h-5 w-5 sm:h-6 sm:w-6" />
                {editingOrder ? "تحديث الطلبية والحفظ" : "تأكيد وطباعة"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
