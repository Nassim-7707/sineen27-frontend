import { Printer, Trash2, Pencil, Calendar } from "lucide-react";
import { Badge, Input } from "./dashboard-ui";
import { Order, OrderStatus, ORDER_STATUS_LABELS } from "@/adminFunctions/orders";

const ONLINE_STATUSES: OrderStatus[] = [
  "قيد التحضير",
  "مكتمل",
  "تم التسليم",
  "ملغى",
];

interface OrdersTabProps {
  orderSearch: string;
  setOrderSearch: (v: string) => void;
  orderTabFilter: string;
  setOrderTabFilter: (v: "all" | "online" | "store") => void;
  orderDateFilter: { start: string; end: string };
  setOrderDateFilter: (v: { start: string; end: string }) => void;
  filteredOrders: Order[];
  updateStatus: (id: string, s: OrderStatus) => void;
  setSelectedOrder: (o: Order) => void;
  setIsInvoiceOpen: (v: boolean) => void;
  deleteOrder: (id: string) => void;
  completeSaleFromOrder: (o: Order) => void;
  onEditOnlineOrder: (o: Order) => void;
  onEditStoreOrder: (o: Order) => void;
  openAddOrderModal: () => void;
}

export default function OrdersTab({
  orderSearch,
  setOrderSearch,
  orderTabFilter,
  setOrderTabFilter,
  orderDateFilter,
  setOrderDateFilter,
  filteredOrders,
  updateStatus,
  setSelectedOrder,
  setIsInvoiceOpen,
  deleteOrder,
  completeSaleFromOrder,
  onEditOnlineOrder,
  onEditStoreOrder,
  openAddOrderModal,
}: OrdersTabProps) {
  const canCompleteSale = (o: Order) =>
    o.isOnlineOrder &&
    o.status !== "تم التسليم" &&
    o.status !== "ملغى";

  return (
    <div className="dashboard-page text-right">
      <header className="dashboard-page-header">
        <div>
          <h1 className="dash-page-title">الطلبات</h1>
          <p className="dash-caption mt-1">متابعة ومعالجة</p>
        </div>
      </header>

      <div className="dashboard-card p-6">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {[
              { id: "all" as const, label: "الكل" },
              { id: "online" as const, label: "الموقع" },
              { id: "store" as const, label: "المحل" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOrderTabFilter(tab.id)}
                className={`px-6 py-2 rounded-xl text-[12px] font-bold transition-all duration-200 ${
                  orderTabFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
          <Input
            placeholder="بحث برقم الطلب، الاسم، الهاتف، أو التاريخ..."
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            className="saneen-input w-full lg:w-80"
          />
          {(orderTabFilter === "all" || orderTabFilter === "online") && (
            <button
              type="button"
              onClick={openAddOrderModal}
              className="dashboard-btn-primary h-12 rounded-xl w-full sm:w-auto"
            >
              + طلب موقع
            </button>
          )}
        </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end pt-4 border-t border-border">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">
              من تاريخ
            </label>
            <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 h-11">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={orderDateFilter.start}
                onChange={(e) => {
                  const val = e.target.value;
                  setOrderDateFilter((prev) => ({
                    start: val,
                    end: prev.end && val > prev.end ? val : prev.end,
                  }));
                }}
                className="w-full bg-transparent text-sm font-bold outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">
              إلى تاريخ
            </label>
            <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 h-11">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={orderDateFilter.end}
                onChange={(e) => {
                  const val = e.target.value;
                  setOrderDateFilter((prev) => ({
                    end: val,
                    start: prev.start && val < prev.start ? val : prev.start,
                  }));
                }}
                className="w-full bg-transparent text-sm font-bold outline-none"
              />
            </div>
          </div>
          {(orderDateFilter.start || orderDateFilter.end) && (
            <button
              type="button"
              onClick={() => setOrderDateFilter({ start: "", end: "" })}
              className="h-11 text-sm font-bold text-destructive hover:underline"
            >
              إعادة تعيين التاريخ
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-table-wrap">
        <table className="dashboard-table min-w-[900px]">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th className="text-center">التاريخ</th>
              <th>الزبون</th>
              <th className="text-center">المصدر</th>
              <th className="text-center">المبلغ</th>
              <th className="text-center">الحالة</th>
              <th className="text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-muted-foreground font-bold">
                  لا توجد طلبيات
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => {
                const total = o.totalDZD ?? o.totalAmount ?? 0;
                const orderDate = o.date
                  ? new Date(o.date).toLocaleDateString("ar-DZ", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—";

                return (
                  <tr key={o.id}>
                    <td className="font-sans">
                      #{o.orderNumber || o.id}
                    </td>
                    <td className="text-center text-xs font-bold text-muted-foreground whitespace-nowrap">
                      {orderDate}
                    </td>
                    <td>
                      <div>
                        <p>{o.customerName || "زبون مجهول"}</p>
                        {o.customerPhone && o.customerPhone !== "0000000000" && (
                          <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                            {o.customerPhone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      {o.isOnlineOrder ? (
                        <Badge className="dashboard-badge-online">موقع</Badge>
                      ) : (
                        <Badge className="dashboard-badge-store">محل</Badge>
                      )}
                    </td>
                    <td className="text-center font-sans tracking-tight">
                      <div>{total.toLocaleString()} دج</div>
                    </td>
                    <td className="text-center">
                      {o.isOnlineOrder ? (
                        <select
                          value={o.status}
                          onChange={(e) =>
                            updateStatus(o.id, e.target.value as OrderStatus)
                          }
                          className="dashboard-select border rounded-xl px-4 py-2 min-w-[130px] text-[11px] font-black"
                        >
                          {ONLINE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {ORDER_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge className="dashboard-badge-success px-4 py-2 text-[11px] font-black">
                          تم البيع مباشرة
                        </Badge>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {o.isOnlineOrder ? (
                          <>
                            <button
                              type="button"
                              className="dashboard-btn-outline h-10 px-3 text-xs rounded-xl hover:bg-primary hover:text-primary-foreground hover:border-primary"
                              title="تعديل الطلبية"
                              onClick={() => onEditOnlineOrder(o)}
                            >
                              <Pencil className="h-4 w-4" />
                              تعديل
                            </button>
                            {canCompleteSale(o) && (
                              <button
                                type="button"
                                className="dashboard-btn-accent h-10 px-3 text-xs rounded-xl"
                                title="إتمام البيع وخصم المخزون"
                                onClick={() => completeSaleFromOrder(o)}
                              >
                                إتمام البيع
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            className="dashboard-btn-outline h-10 px-3 text-xs rounded-xl hover:bg-accent hover:text-accent-foreground hover:border-accent"
                            title="تعديل الفاتورة في نقطة البيع"
                            onClick={() => onEditStoreOrder(o)}
                          >
                            <Pencil className="h-4 w-4" />
                            تعديل الفاتورة
                          </button>
                        )}

                        <button
                          type="button"
                          className="dashboard-btn-outline h-10 px-3 text-xs rounded-xl hover:bg-charcoal hover:text-primary-foreground"
                          title="طباعة"
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsInvoiceOpen(true);
                          }}
                        >
                          <Printer className="h-4 w-4" />
                          <span className="text-[10px] font-bold">طباعة</span>
                        </button>

                        <button
                          type="button"
                          className="h-10 w-10 border border-border rounded-xl flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                          title="حذف"
                          onClick={() => {
                            if (confirm("متأكد من حذف هذا السجل؟"))
                              deleteOrder(o.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
