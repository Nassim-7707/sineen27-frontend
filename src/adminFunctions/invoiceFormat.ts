import type { Order } from "@/adminFunctions/orders";

export interface InvoiceTotalLine {
  label: string;
  value: string;
  emphasis?: "normal" | "strong" | "danger" | "success";
}

const moneyFmt = new Intl.NumberFormat("ar-DZ", {
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return `${moneyFmt.format(Math.round(amount))} دج`;
}

export function formatInvoiceDate(value: string | undefined): string {
  if (!value?.trim()) return "—";
  const raw = value.trim();
  if (raw.includes("/") && !raw.includes("T")) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatOrderReference(order: Pick<Order, "id" | "orderNumber">): string {
  if (order.orderNumber?.trim()) return order.orderNumber.trim();
  return order.id;
}

export function isWalkInPhone(phone?: string): boolean {
  const digits = (phone || "").replace(/\D/g, "");
  return !digits || /^0+$/.test(digits);
}

export function formatPaymentMethod(method?: string): string {
  const map: Record<string, string> = {
    cash: "نقداً",
    card: "بطاقة",
    mixed: "مختلط",
    debt: "آجل",
    partial: "جزئي",
  };
  if (!method) return "—";
  return map[method] || method;
}

export function formatSizeLabel(size: string): string {
  const s = (size || "").trim();
  if (!s) return "—";
  if (/^stand(ar|er)d$/i.test(s)) return "مقاس موحّد";
  return s;
}

/** بنود المجاميع لفاتورة البيع — بدون تكرار */
export function buildSalesInvoiceTotals(order: Order): InvoiceTotalLine[] {
  const itemsSubtotal = order.items.reduce(
    (s, i) => s + i.price * i.quantity,
    0,
  );
  const subtotal =
    order.subtotal != null && order.subtotal > 0
      ? order.subtotal
      : itemsSubtotal;
  const delivery = order.isOnlineOrder ? order.deliveryFee ?? 0 : 0;
  const discount =
    order.globalDiscountAmount ??
    (order.globalDiscountPercent
      ? Math.round((subtotal * order.globalDiscountPercent) / 100)
      : 0);
  const computedTotal = subtotal + delivery - discount;
  const total =
    order.totalDZD ?? order.totalAmount ?? computedTotal;

  const lines: InvoiceTotalLine[] = [
    { label: "مجموع المنتجات", value: formatMoney(subtotal) },
  ];

  if (order.isOnlineOrder) {
    lines.push({
      label: order.customerWilaya
        ? `التوصيل (${order.customerWilaya})`
        : "التوصيل",
      value: formatMoney(delivery),
    });
  }

  if (discount > 0) {
    lines.push({
      label: order.globalDiscountPercent
        ? `خصم (${order.globalDiscountPercent}%)`
        : "خصم",
      value: `−${formatMoney(discount)}`,
      emphasis: "danger",
    });
  }

  lines.push({
    label: "الإجمالي المستحق",
    value: formatMoney(total),
    emphasis: "strong",
  });

  const advance = order.advancePayment ?? 0;
  if (advance > 0 && advance < total) {
    lines.push({
      label: "مدفوع مسبقاً",
      value: formatMoney(advance),
      emphasis: "success",
    });
    lines.push({
      label: "المتبقي",
      value: formatMoney(total - advance),
      emphasis: "strong",
    });
  }

  return lines;
}

