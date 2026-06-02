import { Printer, X } from "lucide-react";
import { ReactNode } from "react";
import { useStoreSettings } from "@/adminFunctions/storeSettings";
import type { Order } from "@/adminFunctions/orders";
import type { PurchaseInvoice } from "@/adminFunctions/purchases";
import type { Product } from "@/adminFunctions/products";
import { calcPurchaseItemsMargin } from "@/adminFunctions/margins";
import { iteratePurchaseVariants } from "@/adminFunctions/variantStock";
import { useSuppliers } from "@/adminFunctions/suppliers";
import {
  buildSalesInvoiceTotals,
  formatInvoiceDate,
  formatMoney,
  formatOrderReference,
  formatPaymentMethod,
  formatSizeLabel,
  isWalkInPhone,
  type InvoiceTotalLine,
} from "@/adminFunctions/invoiceFormat";

/* —— مكوّنات مشتركة —— */

interface InvoiceDocHeaderProps {
  titleAr: string;
  reference: string;
  date: string;
}

export function InvoiceDocHeader({ titleAr, reference, date }: InvoiceDocHeaderProps) {
  const { settings } = useStoreSettings();

  return (
    <header className="invoice-brand border-b-2 border-black pb-5 mb-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="text-right flex-1 min-w-0">
          <h1 className="text-2xl font-black text-black leading-tight">
            {settings.companyName}
          </h1>
          {settings.companyNameEn && (
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wide mt-0.5">
              {settings.companyNameEn}
            </p>
          )}
          <div className="mt-2 text-[11px] text-gray-700 space-y-0.5">
            {settings.companyPhone && (
              <p>
                هاتف:{" "}
                <span className="font-bold text-black" dir="ltr">
                  {settings.companyPhone}
                </span>
              </p>
            )}
            {settings.companyAddress && <p>{settings.companyAddress}</p>}
          </div>
        </div>
        <div className="text-left shrink-0 border-r-0 sm:border-r-2 sm:pr-4 border-black/20">
          <p className="text-lg font-black text-black">{titleAr}</p>
          <dl className="mt-2 text-[11px] space-y-1 text-gray-800">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">المرجع</dt>
              <dd className="font-bold font-sans">{reference}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">التاريخ</dt>
              <dd className="font-bold">{date}</dd>
            </div>
          </dl>
        </div>
      </div>
    </header>
  );
}

interface InvoiceInfoGridProps {
  sections: Array<{
    title: string;
    lines: Array<{ label: string; value: string }>;
  }>;
}

export function InvoiceInfoGrid({ sections }: InvoiceInfoGridProps) {
  return (
    <div
      className={`invoice-info-grid grid gap-4 mb-6 text-[11px] ${sections.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
        }`}
    >
      {sections.map((sec) => (
        <div key={sec.title} className="border border-gray-300 rounded-lg p-3 bg-gray-50/80">
          <h3 className="font-black text-black mb-2 pb-1 border-b border-gray-300">
            {sec.title}
          </h3>
          <dl className="space-y-1">
            {sec.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-2">
                <dt className="text-gray-600 shrink-0">{line.label}</dt>
                <dd className="font-bold text-black text-left">{line.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

export function InvoiceTable({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`invoice-table-wrap overflow-x-auto mb-6 ${className}`}>
      <table className="invoice-table w-full border-collapse text-[11px]">{children}</table>
    </div>
  );
}

export function InvoiceTotals({ lines }: { lines: InvoiceTotalLine[] }) {
  const emphasisClass = (e?: InvoiceTotalLine["emphasis"]) => {
    if (e === "strong") return "text-base font-black border-t-2 border-black pt-2 mt-1";
    if (e === "danger") return "text-red-700 font-bold";
    if (e === "success") return "text-emerald-800 font-bold";
    return "font-bold";
  };

  return (
    <div className="invoice-totals w-full max-w-sm mr-auto border border-gray-300 rounded-lg p-4 bg-gray-50/50">
      <dl className="space-y-2 text-[11px]">
        {lines.map((line) => (
          <div
            key={line.label}
            className={`flex justify-between gap-4 ${emphasisClass(line.emphasis)}`}
          >
            <dt className="text-gray-700">{line.label}</dt>
            <dd className="font-sans shrink-0">{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function InvoiceInternalNote({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="invoice-internal mt-6 pt-4 border-t border-dashed border-gray-400">
      <p className="text-[9px] font-bold text-gray-500 mb-2 text-center uppercase tracking-wide">
        {title}
      </p>
      {children}
    </div>
  );
}

export function InvoiceFooter() {
  const { settings } = useStoreSettings();
  return (
    <footer className="invoice-footer mt-8 pt-3 border-t border-gray-300 text-center text-gray-600">
      <p className="text-[10px] font-bold">شكراً لثقتكم — {settings.companyName}</p>
    </footer>
  );
}

/* —— فاتورة بيع (طلب / POS) —— */

export function SalesInvoiceDocument({ order }: { order: Order }) {
  const customerLines: Array<{ label: string; value: string }> = [
    { label: "الاسم", value: order.customerName || "—" },
  ];
  if (!isWalkInPhone(order.customerPhone)) {
    customerLines.push({
      label: "الهاتف",
      value: order.customerPhone,
    });
  }
  const location = [order.customerWilaya, order.customerAddress]
    .filter(Boolean)
    .join(" — ");
  if (location) {
    customerLines.push({ label: "العنوان", value: location });
  }

  const detailLines: Array<{ label: string; value: string }> = [
    {
      label: "المصدر",
      value: order.isOnlineOrder ? "طلب عبر الموقع" : "بيع من المحل",
    },
  ];
  if (!order.isOnlineOrder && order.cashierName) {
    detailLines.push({ label: "البائع", value: order.cashierName });
  }
  if (order.paymentMethod) {
    detailLines.push({
      label: "الدفع",
      value: formatPaymentMethod(order.paymentMethod),
    });
  }
  if (order.status) {
    detailLines.push({ label: "الحالة", value: order.status });
  }

  return (
    <>
      <InvoiceDocHeader
        titleAr="فاتورة بيع"
        reference={formatOrderReference(order)}
        date={formatInvoiceDate(order.date)}
      />
      <InvoiceInfoGrid
        sections={[
          { title: "الزبون", lines: customerLines },
          { title: "تفاصيل الطلب", lines: detailLines },
        ]}
      />
      <InvoiceTable>
        <thead>
          <tr className="bg-gray-100 text-black">
            <th className="py-2 px-2 text-right font-black">المنتج</th>
            <th className="py-2 px-2 text-center font-black w-16">الكمية</th>
            <th className="py-2 px-2 text-center font-black w-24">السعر</th>
            <th className="py-2 px-2 text-left font-black w-28">المجموع</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, idx) => (
            <tr key={`${it.productId}-${it.size}-${idx}`} className="border-t border-gray-200">
              <td className="py-2 px-2">
                <span className="font-bold block">{it.productName}</span>
                {(it.size || it.color) && (
                  <span className="text-[9px] text-gray-600">
                    {[it.color, it.size ? formatSizeLabel(it.size) : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </td>
              <td className="py-2 px-2 text-center font-sans font-bold">{it.quantity}</td>
              <td className="py-2 px-2 text-center font-sans">{formatMoney(it.price)}</td>
              <td className="py-2 px-2 text-left font-sans font-bold">
                {formatMoney(it.price * it.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </InvoiceTable>
      <InvoiceTotals lines={buildSalesInvoiceTotals(order)} />
      <InvoiceFooter />
    </>
  );
}

/* —— فاتورة مشتريات —— */

export function PurchaseInvoiceDocument({
  purchase,
  products,
}: {
  purchase: PurchaseInvoice;
  products: Product[];
}) {
  const { suppliers } = useSuppliers();
  const supplier = suppliers.find((s) => s.id === purchase.supplierId);
  const margin = calcPurchaseItemsMargin(purchase.items);
  const totalCost = margin.totalCost > 0 ? margin.totalCost : purchase.totalAmount;

  const supplierLines: Array<{ label: string; value: string }> = [
    { label: "المورد", value: supplier?.name || "—" },
  ];
  if (supplier?.phone) {
    supplierLines.push({ label: "هاتف المورد", value: supplier.phone });
  }

  return (
    <>
      <InvoiceDocHeader
        titleAr="فاتورة مشتريات"
        reference={purchase.invoiceNumber}
        date={formatInvoiceDate(purchase.date)}
      />
      <InvoiceInfoGrid
        sections={[
          { title: "المورد", lines: supplierLines },
        ]}
      />
      <InvoiceTable>
        <thead>
          <tr className="bg-gray-100 text-black">
            <th className="py-2 px-2 text-right font-black">المنتج</th>
            <th className="py-2 px-2 text-center font-black">اللون / المقاس</th>
            <th className="py-2 px-2 text-center font-black w-14">الكمية</th>
            <th className="py-2 px-2 text-center font-black w-22">سعر الشراء</th>
            <th className="py-2 px-2 text-left font-black w-24">المجموع</th>
          </tr>
        </thead>
        <tbody>
          {purchase.items.flatMap((item, idx) => {
            const product = products.find((p) => p.id === item.productId);
            return iteratePurchaseVariants(item).map((v, vIdx) => (
              <tr
                key={`${idx}-${v.color}-${v.size}-${vIdx}`}
                className="border-t border-gray-200"
              >
                <td className="py-2 px-2 font-bold">
                  {product?.name || "منتج محذوف"}
                </td>
                <td className="py-2 px-2 text-center text-[10px]">
                  <span className="block font-bold">{v.color}</span>
                  <span>{formatSizeLabel(v.size)}</span>
                </td>
                <td className="py-2 px-2 text-center font-sans font-bold">
                  {v.data.quantity}
                </td>
                <td className="py-2 px-2 text-center font-sans">
                  {formatMoney(v.data.purchasePrice)}
                </td>
                <td className="py-2 px-2 text-left font-sans font-bold">
                  {formatMoney(v.data.quantity * v.data.purchasePrice)}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </InvoiceTable>
      <InvoiceTotals lines={[{ label: "إجمالي المشتريات", value: formatMoney(totalCost), emphasis: "strong" }]} />
      <InvoiceFooter />
    </>
  );
}

/* —— غلاف المعاينة والطباعة —— */

interface InvoicePrintShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidthClass?: string;
}

export default function InvoicePrintShell({
  isOpen,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-2xl",
}: InvoicePrintShellProps) {
  if (!isOpen) return null;

  return (
    <div className="invoice-print-root fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4">
      <div
        className="invoice-print-backdrop absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`invoice-print-card bg-white rounded-xl w-full ${maxWidthClass} shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-300`}
        role="dialog"
        aria-labelledby="invoice-preview-title"
      >
        <div className="invoice-print-toolbar p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <h3
            id="invoice-preview-title"
            className="font-bold text-slate-800 text-sm order-2 sm:order-1 w-full sm:w-auto text-right"
          >
            {title}
          </h3>
          <div className="flex gap-2 order-1 sm:order-2 mr-auto sm:mr-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-10 px-4 sm:px-6 bg-blue-600 text-white rounded-lg text-xs font-black hover:bg-blue-700 shadow-md flex items-center gap-2 min-h-[44px]"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1 min-h-[44px]"
            >
              <X className="h-4 w-4" />
              إغلاق
            </button>
          </div>
        </div>
        <div className="invoice-print-scroll flex-1 overflow-y-auto">
          <div
            id="invoice-content"
            className="invoice-print-body p-6 sm:p-10 md:p-12 bg-white text-right text-black"
            dir="rtl"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
