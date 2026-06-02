import React from "react";
import { Input } from "./dashboard-ui";
import { blockNonNumericKeys, parsePositiveInt } from "@/adminFunctions/validation";
import { sizeLabel, sizesMatch } from "@/adminFunctions/products";
import {
  applyBulkPricesToItem,
  getVariantLine,
  setVariantLine,
  toColorBlock,
  variantMatrixRows,
  type PurchaseLineDraft,
} from "@/adminFunctions/variantStock";
import { calcVariantLineProfit } from "@/adminFunctions/margins";
import { toast } from "sonner";

interface VariantEntryGridProps {
  item: PurchaseLineDraft;
  colors: string[];
  sizes: string[];
  onChange: (item: PurchaseLineDraft) => void;
  /** أدنى كمية لكل صف — مفتاح `${color}|${size}` (المباع من الفاتورة) */
  minQuantities?: Record<string, number>;
}

export default function VariantEntryGrid({
  item,
  colors,
  sizes,
  onChange,
  minQuantities,
}: VariantEntryGridProps) {
  const minQtyFor = (color: string, size: string): number => {
    if (!minQuantities) return 0;
    const direct = minQuantities[`${color}|${size}`];
    if (direct != null) return direct;
    const found = Object.entries(minQuantities).find(([key]) => {
      const [c, s] = key.split("|");
      return c === color && sizesMatch(s, size);
    });
    return found?.[1] ?? 0;
  };
  const rows = variantMatrixRows(colors, sizes);
  const [bulkPurchase, setBulkPurchase] = React.useState("");
  const [bulkSell, setBulkSell] = React.useState("");

  const handleBulkApply = () => {
    const p = parsePositiveInt(bulkPurchase);
    const s = parsePositiveInt(bulkSell);
    if (p <= 0 && s <= 0) return;
    onChange(applyBulkPricesToItem(item, p, s));
  };

  const filledCount = rows.filter(
    ({ color, size }) => getVariantLine(item, color, size).quantity > 0,
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl bg-muted/60 border border-border">
        <span className="text-[11px] font-bold text-muted-foreground w-full sm:w-auto">
          تعبئة سريعة ({filledCount} صف بكمية):
        </span>
        <div className="flex-1 min-w-[100px]">
          <label className="text-[10px] font-bold text-muted-foreground block mb-1">شراء للكل</label>
          <Input
            type="text"
            inputMode="numeric"
            className="h-9 text-center font-sans"
            placeholder="0"
            value={bulkPurchase}
            onKeyDown={blockNonNumericKeys}
            onChange={(e) => setBulkPurchase(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="text-[10px] font-bold text-muted-foreground block mb-1">بيع للكل</label>
          <Input
            type="text"
            inputMode="numeric"
            className="h-9 text-center font-sans"
            placeholder="0"
            value={bulkSell}
            onKeyDown={blockNonNumericKeys}
            onChange={(e) => setBulkSell(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleBulkApply}
          className="dashboard-btn-primary dashboard-btn-sm h-9 px-4"
        >
          تطبيق
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="bg-muted text-[11px] font-black text-muted-foreground">
              <th className="p-2 border-b border-border w-24">اللون</th>
              <th className="p-2 border-b border-border w-20">المقاس</th>
              <th className="p-2 border-b border-border w-20">كمية</th>
              <th className="p-2 border-b border-border w-28">شراء</th>
              <th className="p-2 border-b border-border w-28">بيع</th>
              <th className="p-2 border-b border-border w-24 text-center">فرعي</th>
              <th className="p-2 border-b border-border w-28 text-center">ربح/خسارة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ color, size }, idx) => {
              const line = getVariantLine(item, color, size);
              const minQty = minQtyFor(color, size);
              const sub =
                (line.quantity || 0) * (line.purchasePrice || 0);
              const lineProfit = calcVariantLineProfit(
                line.quantity || 0,
                line.purchasePrice || 0,
                line.suggestedSellingPrice || 0,
              );
              const lineLoss =
                (line.quantity || 0) > 0 &&
                (line.purchasePrice || 0) > 0 &&
                (line.suggestedSellingPrice || 0) > 0 &&
                lineProfit < 0;
              const showColor =
                idx === 0 || rows[idx - 1].color !== color;
              return (
                <tr
                  key={`${color}-${size}`}
                  className={
                    (line.quantity || 0) > 0
                      ? "bg-accent/5"
                      : "bg-card hover:bg-muted/30"
                  }
                >
                  <td className="p-2 border-b border-border/60 font-bold text-accent">
                    {showColor ? color : ""}
                  </td>
                  <td className="p-2 border-b border-border/60 font-bold text-center">
                    {sizeLabel(size)}
                  </td>
                  <td className="p-1 border-b border-border/60">
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-8 text-center font-sans font-bold !min-h-0"
                      placeholder="0"
                      value={
                        (line.quantity || 0) > 0
                          ? String(line.quantity)
                          : ""
                      }
                      onKeyDown={blockNonNumericKeys}
                      onChange={(e) => {
                        const raw = parsePositiveInt(e.target.value);
                        const qty = raw > 0 ? Math.max(minQty, raw) : 0;
                        let next = setVariantLine(item, color, size, { quantity: qty });
                        if (qty > 0 && !line.purchasePrice) {
                          const colorBlock = toColorBlock(item.colors?.[color]);
                          const defP =
                            item.globalPurchasePrice ||
                            colorBlock.globalPurchasePrice ||
                            0;
                          const defS =
                            item.globalSellingPrice ||
                            colorBlock.globalSellingPrice ||
                            0;
                          if (defP) next = setVariantLine(next, color, size, { purchasePrice: defP });
                          if (defS)
                            next = setVariantLine(next, color, size, {
                              suggestedSellingPrice: defS,
                            });
                        }
                        onChange(next);
                      }}
                    />
                    {minQty > 0 && (
                      <p className="text-[9px] text-accent font-bold text-center mt-0.5">
                        مباع: {minQty}
                      </p>
                    )}
                  </td>
                  <td className="p-1 border-b border-border/60">
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-8 text-center font-sans !min-h-0"
                      placeholder="0"
                      value={line.purchasePrice || ""}
                      onKeyDown={blockNonNumericKeys}
                      onChange={(e) =>
                        onChange(
                          setVariantLine(item, color, size, {
                            purchasePrice: parsePositiveInt(e.target.value),
                          }),
                        )
                      }
                    />
                  </td>
                  <td className="p-1 border-b border-border/60">
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-8 text-center font-sans !min-h-0"
                      placeholder="0"
                      value={line.suggestedSellingPrice || ""}
                      onKeyDown={blockNonNumericKeys}
                      onChange={(e) => {
                        const sell = parsePositiveInt(e.target.value);
                        const buy = line.purchasePrice || 0;
                        if (sell > 0 && buy > 0 && sell < buy) {
                          toast.warning("تنبيه: سعر البيع أقل من الشراء", {
                            description: `خسارة ${((line.quantity || 1) * (buy - sell)).toLocaleString()} دج للقطعة`,
                          });
                        }
                        onChange(
                          setVariantLine(item, color, size, {
                            suggestedSellingPrice: sell,
                          }),
                        );
                      }}
                    />
                  </td>
                  <td className="p-2 border-b border-border/60 text-center font-sans text-xs font-bold text-primary">
                    {sub > 0 ? `${sub.toLocaleString()}` : "—"}
                  </td>
                  <td
                    className={`p-2 border-b border-border/60 text-center font-sans text-[11px] font-bold ${
                      lineLoss
                        ? "text-destructive"
                        : lineProfit > 0
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {(line.quantity || 0) > 0 &&
                    (line.purchasePrice || 0) > 0 &&
                    (line.suggestedSellingPrice || 0) > 0
                      ? lineLoss
                        ? `خسارة ${Math.abs(lineProfit).toLocaleString()}`
                        : lineProfit > 0
                          ? `+${lineProfit.toLocaleString()}`
                          : "0"
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
