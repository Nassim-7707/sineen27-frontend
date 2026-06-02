import type { Order } from "@/adminFunctions/orders";

interface OrderFilterOptions {
  searchQuery: string;
  tabFilter: "all" | "online" | "store";
  dateFilter: { start: string; end: string };
  role: string | null;
  currentUser: { username: string } | null;
}

export function filterDashboardOrders(orders: Order[], options: OrderFilterOptions): Order[] {
  const { searchQuery, tabFilter, dateFilter, role, currentUser } = options;

  return orders.filter((o) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.customerPhone && o.customerPhone.includes(searchQuery.trim())) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.date && o.date.includes(searchQuery.trim()));

    const orderDay = o.date ? new Date(o.date) : null;
    const matchesDate =
      !dateFilter.start && !dateFilter.end
        ? true
        : orderDay &&
          (!dateFilter.start || orderDay >= new Date(dateFilter.start)) &&
          (!dateFilter.end || orderDay <= new Date(dateFilter.end + "T23:59:59"));

    const isEmployee = role === "employee";
    const canSeeOrder =
      !isEmployee || o.isOnlineOrder || o.cashierName === currentUser?.username;

    if (!canSeeOrder || !matchesDate) return false;

    if (tabFilter === "online") return matchesSearch && o.isOnlineOrder;
    if (tabFilter === "store") return matchesSearch && !o.isOnlineOrder;
    return matchesSearch as boolean;
  });
}
