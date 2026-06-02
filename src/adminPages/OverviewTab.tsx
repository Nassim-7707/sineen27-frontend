import React, { useState, useMemo } from "react";
import {
   Store, Wifi, Package, DollarSign, ShoppingBag,
   ShoppingCart, Activity, AlertTriangle, Calendar
} from "lucide-react";
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
   ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { Badge } from "./dashboard-ui";
import { Product } from "@/adminFunctions/products";
import { Order } from "@/adminFunctions/orders";
import { useBatches } from "@/adminFunctions/batches";
import { getProductImageSrc } from "@/adminFunctions/products";

interface OverviewTabProps {
   role: string | null;
   orders: Order[];
   products: Product[];
   setActiveTab: (t: string) => void;
   globalReorderLevel: number;
   getProductTotalStock: (productId: string, catalogSizes?: string[]) => number;
}

export default function OverviewTab({
   role, orders, products, setActiveTab, globalReorderLevel, getProductTotalStock
}: OverviewTabProps) {
   const { getProductStockBySize } = useBatches();
   const [showAllAlerts, setShowAllAlerts] = useState(false);

   const today = new Date().toISOString().split('T')[0];
   const [startDate, setStartDate] = useState(today);
   const [endDate, setEndDate] = useState(today);

   const lowStockProducts = useMemo(() => {
      return products.filter(p => {
         if (p.archived) return false;
         const totalStock = getProductTotalStock(p.id, p.sizes);
         return totalStock <= (p.reorderLevel || globalReorderLevel);
      }).sort((a, b) => {
         return getProductTotalStock(a.id, a.sizes) - getProductTotalStock(b.id, b.sizes);
      });
   }, [products, globalReorderLevel, getProductTotalStock]);

   const parseOrderDate = (dateStr: string) => {
      let d: Date;
      if (dateStr.includes("-")) {
         d = new Date(dateStr);
      } else {
         const [day, m, y] = dateStr.split("/").map(Number);
         d = new Date(y, m - 1, day);
      }
      d.setHours(0, 0, 0, 0);
      return d;
   };

   const stats = useMemo(() => {
      const sDate = startDate ? new Date(startDate) : null;
      if (sDate) sDate.setHours(0, 0, 0, 0);
      const eDate = endDate ? new Date(endDate) : null;
      if (eDate) eDate.setHours(23, 59, 59, 999);

      const filteredOrders = orders.filter(o => {
         const oDate = parseOrderDate(o.date);
         const matchesStart = !sDate || oDate >= sDate;
         const matchesEnd = !eDate || oDate <= eDate;
         return matchesStart && matchesEnd;
      });

      const revOnline = filteredOrders.filter(o => o.isOnlineOrder && o.status !== 'ملغى').reduce((sum, o) => sum + o.totalDZD, 0);
      const revStore = filteredOrders.filter(o => !o.isOnlineOrder && o.status !== 'ملغى').reduce((sum, o) => sum + o.totalDZD, 0);

      const cogs = filteredOrders.reduce((total, order) => {
         if (order.status === 'ملغى') return total;
         return total + (order.items?.reduce((sum, item) => {
            if (item.costAtSale !== undefined) {
               return sum + (item.costAtSale * item.quantity);
            }
            const product = products.find(p => p.id === item.productId || p.name === item.productName);
            if (!product) return sum;
            const cost = (item.size && product.sizeCostPrices && product.sizeCostPrices[item.size])
               ? product.sizeCostPrices[item.size]
               : product.costPriceDZD;
            return sum + (cost * item.quantity);
         }, 0) || 0);
      }, 0);

      return {
         revenueOnline: revOnline,
         revenueStore: revStore,
         totalCOGS: cogs,
         totalNetProfit: (revOnline + revStore) - cogs,
         filteredOrders
      };
   }, [orders, products, startDate, endDate]);

   const { revenueOnline, revenueStore, totalCOGS, totalNetProfit } = stats;
   const kpiCols = role === "admin" ? "dashboard-grid-4" : "dashboard-grid sm:grid-cols-2 lg:grid-cols-3";

   const kpiCards = role === 'admin' ? [
      { title: "محل", val: revenueStore, icon: Store, iconClass: 'dashboard-kpi-icon-primary' },
      { title: "موقع", val: revenueOnline, icon: Wifi, iconClass: 'dashboard-kpi-icon-accent' },
      { title: "تكلفة", val: totalCOGS, icon: Package, iconClass: 'dashboard-kpi-icon-muted' },
      { title: "صافي الربح", val: totalNetProfit, icon: DollarSign, iconClass: 'dashboard-kpi-icon-gold' },
   ] : [
      { title: "موقع", val: revenueOnline, icon: Wifi, iconClass: 'dashboard-kpi-icon-accent' },
      { title: "محل", val: revenueStore, icon: Store, iconClass: 'dashboard-kpi-icon-primary' },
      { title: "الإجمالي", val: revenueOnline + revenueStore, icon: ShoppingBag, iconClass: 'dashboard-kpi-icon-gold' },
   ];

   return (
      <div className="dashboard-page">
         <div className="dashboard-card p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:gap-6">
               <div>
                  <h1 className="dash-page-title">الرئيسية</h1>
                  <p className="dash-caption mt-1">ملخص اليوم</p>
               </div>
               <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                  <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 dashboard-card-flat px-3 py-2 sm:px-4">
                     <Calendar className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                     <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input type="date" value={startDate} onChange={e => { const val = e.target.value; setStartDate(val); if (endDate && val > endDate) setEndDate(val); }} className="dashboard-input !h-9 !min-w-0 !w-full sm:!w-[130px] !bg-transparent !border-0 !shadow-none !ring-0 text-xs" />
                        <span className="dash-caption">—</span>
                        <input type="date" value={endDate} onChange={e => { const val = e.target.value; setEndDate(val); if (startDate && val < startDate) setStartDate(val); }} className="dashboard-input !h-9 !min-w-0 !w-full sm:!w-[130px] !bg-transparent !border-0 !shadow-none !ring-0 text-xs" />
                     </div>
                     {(startDate || endDate) && (
                        <button type="button" onClick={() => { setStartDate(""); setEndDate(""); }} className="dashboard-btn-ghost dashboard-btn-sm !px-2 text-destructive">مسح</button>
                     )}
                  </div>
                  <button type="button" onClick={() => { window.location.hash = "#pos"; }} className="dashboard-btn-primary">
                     <ShoppingCart className="h-4 w-4" />
                     بيع سريع
                  </button>
               </div>
            </div>
         </div>

         <div className={kpiCols}>
            {kpiCards.map((card, i) => {
               const Icon = card.icon;
               return (
                  <div key={i} className="dashboard-stat-card">
                     <div className={card.iconClass}>
                        <Icon className="h-5 w-5" />
                     </div>
                     <div className="mt-4">
                        <p className="dash-stat-value">
                           {card.val.toLocaleString()}
                           <span className="text-sm text-muted-foreground font-bold ms-1">دج</span>
                        </p>
                        <p className="dash-stat-label">{card.title}</p>
                     </div>
                  </div>
               );
            })}
         </div>

         <div className="dashboard-grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="dashboard-card md:col-span-2 min-h-[280px] sm:min-h-[340px]">
               <div className="dashboard-section-head">
                  <h2 className="dash-section-title">المبيعات</h2>
                  <span className="dashboard-badge-online text-[9px] sm:text-[10px]">{startDate && endDate ? `${startDate} — ${endDate}` : "الكل"}</span>
               </div>
               <div className="h-[220px] sm:h-[280px] w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={[
                        { name: 'السبت', sales: 12000 }, { name: 'الأحد', sales: 19000 },
                        { name: 'الاثنين', sales: 15000 }, { name: 'الثلاثاء', sales: 22000 },
                        { name: 'الأربعاء', sales: 18000 }, { name: 'الخميس', sales: 25000 },
                        { name: 'الجمعة', sales: (revenueOnline + revenueStore) || 30000 }
                     ]} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(35 15% 92%)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(30 8% 50%)', fontSize: 10 }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(30 8% 50%)', fontSize: 10 }} width={45} />
                        <Tooltip cursor={{ fill: 'hsl(35 15% 92%)' }} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(35 15% 85%)', boxShadow: '0 8px 24px hsl(30 10% 15% / 0.08)', textAlign: 'right', fontSize: '12px' }} />
                        <Bar dataKey="sales" fill="hsl(35 45% 30%)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="dashboard-chart-panel flex flex-col">
               <h2 className="dash-card-title mb-4 flex items-center gap-2 text-primary-foreground/90">
                  <Activity className="h-4 w-4 text-accent" /> القنوات
               </h2>
               <div className="h-[180px] flex-1" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={[
                              { name: 'موقع', value: revenueOnline || 40 },
                              { name: 'محل', value: revenueStore || 60 }
                           ]}
                           cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none"
                        >
                           <Cell fill="hsl(40 60% 50%)" />
                           <Cell fill="hsl(30 5% 60%)" />
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: 'hsl(30 10% 20%)', color: 'hsl(35 30% 96%)' }} />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-primary-foreground/10">
                  <span className="flex items-center gap-2 text-xs text-primary-foreground/70"><span className="w-2.5 h-2.5 rounded-full bg-accent" /> موقع</span>
                  <span className="flex items-center gap-2 text-xs text-primary-foreground/70"><span className="w-2.5 h-2.5 rounded-full bg-warm-gray" /> محل</span>
               </div>
            </div>
         </div>

         <div className="dashboard-grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6">
            <div className="dashboard-card md:col-span-3">
               <div className="dashboard-section-head">
                  <h2 className="dash-section-title">آخر الطلبات</h2>
                  <button type="button" onClick={() => { window.location.hash = "#orders"; }} className="dashboard-btn-ghost dashboard-btn-sm text-accent">عرض الكل</button>
               </div>
               <div className="space-y-2">
                  {orders.length === 0 ? (
                     <div className="dashboard-empty py-12">
                        <div className="dashboard-empty-icon"><ShoppingBag className="h-6 w-6" /></div>
                        <p className="dash-card-title">لا طلبات</p>
                        <p className="dash-caption">ستظهر هنا</p>
                     </div>
                  ) : (
                     orders.slice(0, 5).map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/40 transition-colors">
                           <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${o.isOnlineOrder ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                 {o.isOnlineOrder ? <Wifi className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                 <p className="font-semibold text-sm text-foreground truncate">{(o.customerName === "زبون محلي" || o.customerName === "بيع مباشر (المحل)" || o.customerName?.includes("عميل محلي")) ? "بيع محلي" : o.customerName}</p>
                                 <p className="dash-caption">#{o.orderNumber || o.id}</p>
                              </div>
                           </div>
                           <span className="font-bold text-foreground shrink-0 tabular-nums">{o.totalDZD.toLocaleString()} <span className="text-[10px] text-muted-foreground">دج</span></span>
                        </div>
                     ))
                  )}
               </div>
            </div>

            <div className="dashboard-card md:col-span-2">
               <div className="dashboard-section-head">
                  <h2 className="dash-section-title flex items-center gap-2">
                     <AlertTriangle className="h-4 w-4 text-destructive" /> المخزون
                  </h2>
                  {lowStockProducts.length > 0 && (
                     <span className="dashboard-badge bg-destructive/10 text-destructive">{lowStockProducts.length}</span>
                  )}
               </div>
               <div className="space-y-3 max-h-[420px] overflow-y-auto">
                  {lowStockProducts.length === 0 ? (
                     <div className="dashboard-empty py-10">
                        <Package className="h-8 w-8 text-accent mb-2" />
                        <p className="dash-caption">المخزون جيد</p>
                     </div>
                  ) : (
                     lowStockProducts.slice(0, 5).map(p => {
                        const totalStock = getProductTotalStock(p.id, p.sizes);
                        return (
                           <div key={p.id} className="p-4 rounded-xl border border-border/60 bg-muted/20 hover:border-accent/30 transition-colors">
                              <div className="flex justify-between gap-2 mb-2">
                                 <p className="text-sm font-bold text-foreground line-clamp-2 flex-1">{p.name}</p>
                                 <Badge className={`shrink-0 ${totalStock === 0 ? 'bg-destructive' : 'bg-accent'} text-accent-foreground text-[10px]`}>{totalStock}</Badge>
                              </div>
                              <button type="button" onClick={() => { window.location.hash = "#purchases"; }} className="dashboard-btn-outline w-full dashboard-btn-sm mt-2">
                                 تعبئة مخزون
                              </button>
                           </div>
                        );
                     })
                  )}
                  {lowStockProducts.length > 5 && (
                     <button type="button" onClick={() => setShowAllAlerts(true)} className="w-full py-2 text-xs font-bold text-primary border border-dashed border-primary/25 rounded-xl hover:bg-primary/5">
                        +{lowStockProducts.length - 5} أخرى
                     </button>
                  )}
               </div>
            </div>
         </div>

         {showAllAlerts && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
               <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => setShowAllAlerts(false)} aria-hidden />
               <div className="dashboard-modal-panel relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col">
                  <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
                     <h3 className="dash-section-title flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> المخزون</h3>
                     <button type="button" onClick={() => setShowAllAlerts(false)} className="dashboard-btn-ghost h-9 w-9 !p-0 rounded-full">✕</button>
                  </div>
                  <div className="p-5 overflow-y-auto space-y-3 flex-1">
                     {lowStockProducts.map(p => {
                        const total = getProductTotalStock(p.id, p.sizes);
                        return (
                           <div key={p.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border">
                              <div className="flex items-center gap-3 min-w-0">
                                 <div className="h-11 w-11 rounded-xl bg-muted overflow-hidden shrink-0">
                                    <img src={getProductImageSrc(p.image)} className="h-full w-full object-cover" alt="" />
                                 </div>
                                 <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{p.name}</p>
                                    <p className="dash-caption">{p.category}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <Badge className={total === 0 ? 'bg-destructive' : 'bg-accent'}>{total}</Badge>
                                 <button type="button" onClick={() => { setShowAllAlerts(false); window.location.hash = "#purchases"; }} className="dashboard-btn-primary dashboard-btn-sm">شراء</button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
