import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";
import {
  useAuth,
  RECOVERY_ANSWER_MIN_LENGTH,
  RECOVERY_ANSWER_MAX_LENGTH,
} from "@/adminFunctions/auth";
import { useProducts, Product } from "@/adminFunctions/products";
import {
  useOrders,
  Order,
  OrderStatus,
  PosCartItem,
  getPosCartQtyForVariant,
  getPosCartSubtotal,
  getEffectiveUnitPrice,
} from "@/adminFunctions/orders";
import { useTransactions } from "@/adminFunctions/transactions";
import {
  usePurchases,
  sanitizePurchasePayload,
  getProductVariantMinQty,
} from "@/adminFunctions/purchases";
import {
  calcPurchaseItemsMargin,
  getPurchasePriceForVariant,
  wouldDiscountCauseLoss,
  priceAfterDiscount,
} from "@/adminFunctions/margins";
import {
  calcPurchaseTotal,
  preparePurchaseEditItems,
  purchaseItemHasStock,
} from "@/adminFunctions/variantStock";
import { useBatches } from "@/adminFunctions/batches";
import AdminNavbar from "./AdminNavbar";
import { filterDashboardOrders } from "@/adminFunctions/orderFilters";
import { buildSaleItemsFromOrder } from "@/adminFunctions/saleHelpers";
import { toast } from "sonner";
import {
  validateLoginForm,
  validateProductForm,
  validateOrderCustomer,
  validateFilterLabel,
  formatUsernameInput,
  validateInvoiceDate,
  validatePasswordStrength,
} from "@/adminFunctions/validation";
import { useStoreSettings } from "@/adminFunctions/storeSettings";
import { useSuppliers } from "@/adminFunctions/suppliers";
import {
  OverviewTab,
  POSTab,
  CatalogTab,
  OrdersTab,
  FiltersTab,
  LogisticsTab,
  UsersTab,
  PurchasesTab,
  RecoverySecretAlert,
  ProductModal,
  OrderModal,
  InvoiceModal,
  PurchaseModal,
  PurchaseInvoiceViewModal,
} from "@/adminPages";

const DASHBOARD_TABS = [
  "overview",
  "pos",
  "catalog",
  "orders",
  "filters",
  "settings",
  "users",
  "purchases",
] as const;
type DashboardTab = (typeof DASHBOARD_TABS)[number];

export default function Dashboard() {
  // 1. ALL HOOKS MUST BE CALLED AT THE TOP (Rules of Hooks)
  const {
    role,
    currentUser,
    login,
    addUser,
    users,
    deleteUser,
    updatePassword,
    setUserPassword,
    hasRecoverySecretConfigured,
    setAdminRecoverySecret,
    resetAdminPasswordWithRecovery,
  } = useAuth();
  const productsContext = useProducts();
  const ordersContext = useOrders();
  const { completeSale } = useTransactions();
  const {
    purchases,
    addPurchaseInvoice,
    cancelPurchaseInvoice,
    updatePurchaseInvoice,
  } = usePurchases();
  const {
    batches,
    getProductTotalStock,
    getProductStockBySize,
    getLowestSellingPrice,
    getLowestSellingPriceBySize,
  } = useBatches();
  const { settings, updateSettings } = useStoreSettings();
  const { suppliers, addSupplier, deleteSupplier } = useSuppliers();
  const { hash } = useLocation();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const setTab = (tab: string) => {
    window.location.hash = tab;
  };

  useEffect(() => {
    const h = (hash.replace("#", "") || "overview") as DashboardTab;
    if ((DASHBOARD_TABS as readonly string[]).includes(h)) setActiveTab(h);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [hash]);

  useEffect(() => {
    if (role !== "admin" || hasRecoverySecretConfigured()) return;
    if (sessionStorage.getItem("saneen_recovery_warn_toast")) return;
    sessionStorage.setItem("saneen_recovery_warn_toast", "1");
    toast.warning("لم تُضبط كلمة استرداد الحساب", {
      description:
        "بدونها لن تستطيع استعادة الدخول إذا نسيت كلمة المرور. اضبطها من الإعدادات.",
      duration: 12000,
    });
  }, [role, currentUser, hasRecoverySecretConfigured]);

  // Authentication State
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginErrors, setLoginErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [resetForm, setResetForm] = useState({
    username: "",
    recoveryAnswer: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [editOrderData, setEditOrderData] = useState<Partial<Order>>({});
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [purchaseData, setPurchaseData] = useState<any>({});
  const [isPurchaseInvoiceViewOpen, setIsPurchaseInvoiceViewOpen] =
    useState(false);
  const [selectedPurchaseInvoice, setSelectedPurchaseInvoice] =
    useState<any>(null);

  // POS & Filtering States
  const [posSearch, setPosSearch] = useState("");
  const [posCart, setPosCart] = useState<PosCartItem[]>([]);
  const [flippedProductId, setFlippedProductId] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [newFilterValues, setNewFilterValues] = useState({
    sizes: "",
    categories: "",
  });
  const [newWilayaName, setNewWilayaName] = useState("");
  const [newWilayaFee, setNewWilayaFee] = useState(600);
  const [globalReorderLevel, setGlobalReorderLevel] = useState(5);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderTabFilter, setOrderTabFilter] = useState<
    "all" | "online" | "store"
  >("all");
  const [orderDateFilter, setOrderDateFilter] = useState({
    start: "",
    end: "",
  });
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // 2. EVENT HANDLERS
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateLoginForm(loginForm.username, loginForm.password);
    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      toast.error("يرجى تصحيح بيانات الدخول");
      return;
    }
    setLoginErrors({});
    setIsLoggingIn(true);
    try {
      await login(loginForm.username.trim(), loginForm.password);
      toast.success("تم تسجيل الدخول بنجاح");
    } catch {
      toast.error("خطأ في اسم المستخدم أو كلمة المرور");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleConfirmAdminReset = async () => {
    if (!resetForm.username.trim() || !resetForm.recoveryAnswer.trim()) {
      toast.error("أدخل اسم الأدمن ورمز الاسترداد");
      return;
    }
    if (resetForm.recoveryAnswer.trim().length < RECOVERY_ANSWER_MIN_LENGTH) {
      toast.error("رمز الاسترداد: كلمة أو كلمتان على الأقل");
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      toast.error("كلمة المرور الجديدة غير متطابقة");
      return;
    }
    const check = validatePasswordStrength(resetForm.newPassword);
    if (!check.valid) {
      toast.error(check.message);
      return;
    }
    setIsConfirmingReset(true);
    try {
      await resetAdminPasswordWithRecovery(
        resetForm.username.trim(),
        resetForm.recoveryAnswer,
        resetForm.newPassword,
      );
      toast.success("تم تعيين كلمة مرور جديدة — يمكنك تسجيل الدخول الآن");
      setIsResetOpen(false);
      setResetForm({
        username: "",
        recoveryAnswer: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الاسترجاع");
    } finally {
      setIsConfirmingReset(false);
    }
  };

  const cancelEdit = () => {
    setEditingOrder(null);
    setPosCart([]);
  };

  const completeSaleFromOrder = async (order: Order) => {
    const total = order.totalDZD ?? order.totalAmount ?? 0;
    const delivery = order.deliveryFee ?? 0;

    try {
      const saleItems = buildSaleItemsFromOrder(order, products);
      await completeSale({
        date: new Date().toISOString(),
        customerId: order.customerId ?? null,
        items: saleItems,
        subtotal: order.subtotal ?? total - delivery,
        globalDiscountPercent: order.globalDiscountPercent ?? 0,
        globalDiscountAmount: order.globalDiscountAmount ?? 0,
        totalAmount: total,
        paidAmount: total,
        paymentMethod: (order.paymentMethod as "cash") || "cash",
        cashierName: currentUser?.username || "Unknown",
      });
      await updateOrderStatus(order.id, "تم التسليم");
      toast.success("تم إتمام البيع بنجاح وتحديث حالة الطلب");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إتمام البيع";
      toast.error(msg);
    }
  };

  // 4. CONDITIONAL RETURNS FOR AUTH & LOADING
  if (!currentUser) {
    return (
      <div
        className="dashboard-app flex items-center justify-center p-6 sm:p-8"
        dir="rtl"
      >
        <div className="w-full max-w-[400px] dashboard-fade-in">
          <div className="text-center mb-8">
            <div className="h-16 w-16 dashboard-nav-brand-icon rounded-2xl mx-auto mb-6">
              <Lock className="h-8 w-8 text-accent-foreground" />
            </div>
            <h1 className="dash-page-title">{settings.companyName}</h1>
            <p className="dash-caption mt-2">
              {settings.companyNameEn || "لوحة التحكم"}
            </p>
          </div>
          <div className="dashboard-card p-8">
            <form onSubmit={handleLogin} className="space-y-6" noValidate>
              <div>
                <label className="dashboard-label">المستخدم</label>
                <input
                  type="text"
                  className={`dashboard-input w-full rounded-xl font-bold ${loginErrors.username ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                  value={loginForm.username}
                  onChange={(e) => {
                    setLoginForm({
                      ...loginForm,
                      username: formatUsernameInput(e.target.value),
                    });
                    if (loginErrors.username)
                      setLoginErrors((er) => ({ ...er, username: undefined }));
                  }}
                  placeholder="admin"
                  maxLength={30}
                />
                {loginErrors.username && (
                  <p className="text-xs text-destructive mt-1 font-bold">
                    {loginErrors.username}
                  </p>
                )}
              </div>
              <div>
                <label className="dashboard-label">كلمة المرور</label>
                <input
                  type="password"
                  className={`dashboard-input w-full rounded-xl font-bold ${loginErrors.password ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                  value={loginForm.password}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, password: e.target.value });
                    if (loginErrors.password)
                      setLoginErrors((e) => ({ ...e, password: undefined }));
                  }}
                  placeholder="••••••••"
                  maxLength={64}
                />
                {loginErrors.password && (
                  <p className="text-xs text-destructive mt-1 font-bold">
                    {loginErrors.password}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsResetOpen(true);
                    setResetForm((prev) => ({
                      ...prev,
                      username: loginForm.username || "admin",
                    }));
                  }}
                  className="text-xs text-accent hover:underline font-bold mt-3"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="dashboard-btn-accent w-full h-12 sm:h-14 rounded-xl min-h-[48px]"
              >
                {isLoggingIn ? "جاري الدخول..." : "دخول"}
              </button>

              {isResetOpen && (
                <div className="border-t border-border/60 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-accent" />
                      <p className="text-sm font-bold">استرجاع حساب الأدمن</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setIsResetOpen(false);
                        setResetForm({
                          username: "",
                          recoveryAnswer: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                      }}
                    >
                      إغلاق
                    </button>
                  </div>

                  {!hasRecoverySecretConfigured() && (
                    <p className="text-xs text-destructive font-bold leading-relaxed">
                      رمز الاسترداد غير مضبوط على هذا الجهاز.
                    </p>
                  )}
                  <div>
                    <label className="dashboard-label">اسم الأدمن</label>
                    <input
                    type="text"
                    className="dashboard-input w-full rounded-xl font-bold"
                    value={resetForm.username}
                    onChange={(e) =>
                      setResetForm((prev) => ({
                        ...prev,
                        username: formatUsernameInput(e.target.value),
                      }))
                    }
                    placeholder="admin"
                    maxLength={30}
                  />
                  </div>
                  <div>
                    <label className="dashboard-label">رمز الاسترداد</label>
                    <input
                    type="text"
                    className="dashboard-input w-full rounded-xl font-bold"
                    value={resetForm.recoveryAnswer}
                    onChange={(e) =>
                      setResetForm((prev) => ({
                        ...prev,
                        recoveryAnswer: e.target.value.slice(
                          0,
                          RECOVERY_ANSWER_MAX_LENGTH,
                        ),
                      }))
                    }
                    placeholder="••••"
                    maxLength={RECOVERY_ANSWER_MAX_LENGTH}
                    autoComplete="off"
                  />
                  </div>
                  <div>
                    <label className="dashboard-label">كلمة المرور الجديدة</label>
                    <input
                    type="password"
                    className="dashboard-input w-full rounded-xl font-bold"
                    value={resetForm.newPassword}
                    onChange={(e) =>
                      setResetForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value.slice(0, 64),
                      }))
                    }
                    placeholder="••••••••"
                    maxLength={64}
                  />
                  </div>
                  <div>
                    <label className="dashboard-label">تأكيد كلمة المرور</label>
                    <input
                    type="password"
                    className="dashboard-input w-full rounded-xl font-bold"
                    value={resetForm.confirmPassword}
                    onChange={(e) =>
                      setResetForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value.slice(0, 64),
                      }))
                    }
                    placeholder="••••••••"
                    maxLength={64}
                  />
                  </div>
                  <button
                    type="button"
                    disabled={isConfirmingReset}
                    onClick={() => void handleConfirmAdminReset()}
                    className="dashboard-btn-accent w-full h-11 rounded-xl"
                  >
                    {isConfirmingReset
                      ? "جاري التحديث..."
                      : "تغيير كلمة المرور"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!productsContext || !ordersContext) {
    return (
      <div
        className="dashboard-app flex items-center justify-center gap-3 p-8"
        dir="rtl"
      >
        <div className="dashboard-skeleton h-10 w-10 rounded-full" />
        <span className="text-sm font-semibold text-muted-foreground">
          جاري التحميل…
        </span>
      </div>
    );
  }

  // 5. DATA EXTRACTION (AFTER HOOKS & LOADING)
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductPublished,
    moveProduct,
    updateFilter,
    categorySizes,
    categories,
  } = productsContext;
  const {
    orders,
    addOrder,
    updateOrderStatus,
    updateOrder,
    deleteOrder,
    wilayaFees,
    wilayaCommunes,
    updateWilayaFee,
    addWilaya,
    deleteWilaya,
    renameWilaya,
    setWilayaCommunesList,
    restoreMissingWilayas,
  } = ordersContext;

  const editOrderInPOS = (order: Order) => {
    if (order.isOnlineOrder) {
      toast.error("طلبيات الموقع تُعدَّل من زر «تعديل» وليس من نقطة البيع");
      return;
    }

    const newCart = order.items
      .map((item) => {
        const product = products.find(
          (p) => p.id === item.productId || p.name === item.productName,
        );
        if (!product) {
          toast.error(`المنتج «${item.productName}» غير موجود في الكتالوج`);
          return null;
        }
        return {
          product,
          size: item.size,
          color: item.color || product.colors?.[0] || "",
          quantity: item.quantity,
          unitPrice: item.price,
          lineDiscount: 0,
        };
      })
      .filter(Boolean) as PosCartItem[];

    if (newCart.length === 0) {
      toast.error("لا يمكن تحميل الفاتورة: لا توجد منتجات صالحة");
      return;
    }

    setPosCart(newCart);
    setEditingOrder(order);
    setTab("pos");
    window.location.hash = "#pos";
    toast.info(`تعديل فاتورة المحل #${order.orderNumber || order.id}`);
  };

  const openEditOnlineOrder = (order: Order) => {
    setOrderToEdit(order);
    setEditOrderData({
      ...order,
      items: order.items.map((i) => ({ ...i })),
      isOnlineOrder: true,
    });
    setIsEditOrderModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const productErrors = validateProductForm({
      name: formData.name,
      discountPercent: formData.discountPercent,
      description: formData.description,
      category: formData.category,
      colors: formData.colors,
    });
    if (Object.keys(productErrors).length > 0) {
      toast.error(
        Object.values(productErrors)[0] || "يرجى تصحيح بيانات المنتج",
      );
      return;
    }
    const finalData = {
      ...formData,
      sizes: categorySizes[formData.category || ""] || [],
      colors: formData.colors?.length ? formData.colors : [],
    };

    // User cannot add new filters from here anymore, handled in filters tab.

    if (editingProduct) updateProduct(editingProduct.id, finalData);
    else addProduct(finalData as Omit<Product, "id">);
    setIsAddModalOpen(false);
    toast.success("تم الحفظ");
  };

  const handlePurchaseSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!purchaseData.supplierId || !purchaseData.date) {
      toast.error("يرجى ملء البيانات المطلوبة (المورد والتاريخ)");
      return;
    }

    const dateCheck = validateInvoiceDate(purchaseData.date);
    if (!dateCheck.valid) {
      toast.error(dateCheck.message);
      return;
    }

    const hasValidQuantity = (purchaseData.items || []).some((item) =>
      purchaseItemHasStock(item),
    );

    if (!hasValidQuantity) {
      toast.error(
        "يرجى إدخال كمية وسعر شراء لتركيبة لون + مقاس واحدة على الأقل",
      );
      return;
    }

    const margin = calcPurchaseItemsMargin(purchaseData.items || []);
    if (margin.isLoss && margin.totalRevenue > 0) {
      toast.warning("تنبيه: فاتورة بخسارة", {
        description: `البيع المتوقع (${margin.totalRevenue.toLocaleString()} دج) أقل من التكلفة (${margin.totalCost.toLocaleString()} دج)`,
      });
    }

    if (editingPurchase) {
      const payload = sanitizePurchasePayload({
        supplierId: purchaseData.supplierId ?? null,
        date: purchaseData.date || editingPurchase.date,
        notes: purchaseData.notes,
        items: purchaseData.items || [],
        totalAmount: purchaseData.totalAmount || 0,
        paidAmount: purchaseData.paidAmount ?? purchaseData.totalAmount ?? 0,
        paymentMethod:
          purchaseData.paymentMethod || editingPurchase.paymentMethod || "cash",
      });
      const res = updatePurchaseInvoice(editingPurchase.id, payload);
      if (res.success) {
        toast.success("تم تعديل الفاتورة بنجاح");
      } else {
        toast.error(res.error || "حدث خطأ أثناء تعديل الفاتورة");
        return;
      }
    } else {
      try {
        addPurchaseInvoice(purchaseData);
        toast.success("تم إضافة الفاتورة وإنشاء الدفعات بنجاح");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "تعذر حفظ الفاتورة");
        return;
      }
    }

    setIsPurchaseModalOpen(false);
  };

  const handleAddFilter = (
    type: "categorySizes" | "categories",
    categoryForSize?: string,
  ) => {
    const val = (newFilterValues as any)[type];
    const check = validateFilterLabel(val || "");
    if (!check.valid) {
      toast.error(check.message);
      return;
    }
    updateFilter(type, "add", val.trim(), categoryForSize);
    setNewFilterValues({ ...newFilterValues, [type]: "" });
    toast.success("تمت إضافة الفلتر");
  };

  // 6. FINAL RENDER
  return (
    <div className="dashboard-app" dir="rtl">
      <AdminNavbar />
      <main className="dashboard-content">
        {role === "admin" && !hasRecoverySecretConfigured() && (
          <RecoverySecretAlert />
        )}
        {activeTab === "overview" && (
          <OverviewTab
            role={role}
            orders={orders}
            products={products}
            setActiveTab={(t) => {
              window.location.hash = t;
            }}
            globalReorderLevel={globalReorderLevel}
            getProductTotalStock={getProductTotalStock}
          />
        )}
        {activeTab === "pos" && (
          <POSTab
            posSearch={posSearch}
            setPosSearch={setPosSearch}
            filteredPosProducts={(products || []).filter((p: any) =>
              p.name.includes(posSearch),
            )}
            flippedProductId={flippedProductId}
            setFlippedProductId={setFlippedProductId}
            addToPosCart={(p, s, color) => {
              const stock = getProductStockBySize(p.id, s, color);
              const inCart = getPosCartQtyForVariant(posCart, p.id, s, color);
              if (inCart >= stock) {
                toast.error(
                  `لا يوجد مخزون كافٍ — المتبقي ${Math.max(0, stock - inCart)}`,
                );
                return;
              }
              const unitPrice =
                getLowestSellingPriceBySize(p.id, s, color) ||
                getLowestSellingPrice(p.id) ||
                0;
              setPosCart((prev) => {
                const ex = prev.find(
                  (i) =>
                    i.product.id === p.id && i.size === s && i.color === color,
                );
                if (ex) {
                  return prev.map((i) =>
                    i === ex ? { ...i, quantity: i.quantity + 1 } : i,
                  );
                }
                return [
                  ...prev,
                  {
                    product: p,
                    size: s,
                    color,
                    quantity: 1,
                    unitPrice,
                    lineDiscount: 0,
                  },
                ];
              });
            }}
            autoPrint={autoPrint}
            setAutoPrint={setAutoPrint}
            posCart={posCart}
            setPosCart={setPosCart}
            updatePosCartQty={(idx, d) => {
              const item = posCart[idx];
              if (!item) return;
              const color =
                item.color || productColors(item.product.colors)[0] || "";
              const newQty = item.quantity + d;
              if (newQty < 1) {
                setPosCart((prev) => prev.filter((_, i) => i !== idx));
                return;
              }
              const stock = getProductStockBySize(
                item.product.id,
                item.size,
                color,
              );
              const others = getPosCartQtyForVariant(
                posCart,
                item.product.id,
                item.size,
                color,
                idx,
              );
              if (others + newQty > stock) {
                toast.error(`الكمية المتاحة: ${Math.max(0, stock - others)}`);
                return;
              }
              setPosCart((prev) =>
                prev.map((it, i) =>
                  i === idx ? { ...it, quantity: newQty } : it,
                ),
              );
            }}
            updateLineDiscount={(idx, amount) => {
              setPosCart((prev) => {
                const item = prev[idx];
                if (item) {
                  const cost = getPurchasePriceForVariant(
                    item.product.id,
                    item.size,
                    item.color,
                    batches,
                  );
                  if (wouldDiscountCauseLoss(item.unitPrice, amount, cost)) {
                    const after = priceAfterDiscount(item.unitPrice, amount);
                    toast.warning("تنبيه: الخصم قد يسبب خسارة", {
                      description: `السعر بعد الخصم (${after.toLocaleString()} دج) أقل من التكلفة (${cost.toLocaleString()} دج)`,
                    });
                  }
                }
                return prev.map((it, i) =>
                  i === idx ? { ...it, lineDiscount: amount } : it,
                );
              });
            }}
            removeFromPosCart={(idx) =>
              setPosCart((prev) => prev.filter((_, i) => i !== idx))
            }
            processPosSale={async () => {
              if (posCart.length === 0) return;

              // Pre-flight check (atomic deduction)
              if (!editingOrder) {
                const requiredQty = new Map<string, number>();
                posCart.forEach((i) => {
                  const key = `${i.product.id}||${i.color}||${i.size}`;
                  requiredQty.set(
                    key,
                    (requiredQty.get(key) || 0) + i.quantity,
                  );
                });

                const insufficient: string[] = [];
                for (const [key, qty] of requiredQty.entries()) {
                  const [pid, color, size] = key.split("||");
                  const product = products.find((p) => p.id === pid);
                  const currentStock = getProductStockBySize(pid, size, color);
                  if (currentStock < qty) {
                    insufficient.push(
                      `${product?.name} (${color} / ${size}): مطلوب ${qty} والمتوفر ${currentStock}`,
                    );
                  }
                }

                if (insufficient.length > 0) {
                  toast.error(
                    `لا يوجد مخزون كافٍ للإتمام:\n${insufficient.join("\n")}`,
                  );
                  return; // Abort entirely
                }
              }

              const cartTotal = getPosCartSubtotal(posCart);
              const orderData = {
                customerName: editingOrder
                  ? editingOrder.customerName
                  : "زبون محلي",
                customerPhone: editingOrder
                  ? editingOrder.customerPhone
                  : "0000000000",
                customerWilaya: editingOrder
                  ? editingOrder.customerWilaya
                  : "بيع مباشر",
                deliveryType: editingOrder ? editingOrder.deliveryType : "محل",
                items: posCart.map((i) => {
                  const costPrice =
                    i.size && i.product.sizeCostPrices?.[i.size]
                      ? i.product.sizeCostPrices[i.size]
                      : i.product.costPriceDZD;
                  return {
                    productName: i.product.name,
                    productId: i.product.id,
                    quantity: i.quantity,
                    price: getEffectiveUnitPrice(i),
                    size: i.size,
                    color: i.color,
                    costAtSale: costPrice,
                  };
                }),
                totalDZD: cartTotal,
                subtotal: cartTotal,
                isOnlineOrder: false,
                deliveryFee: 0,
                status: "مكتمل",
                cashierName: currentUser?.username || "Unknown",
              };

              if (editingOrder) {
                // Update existing order keeping the same ID
                updateOrder(editingOrder.id, orderData as any);
                setEditingOrder(null);
                toast.success("تم تحديث الطلب بنجاح");
              } else {
                // Create new order
                // Process Sale via transactions context
                await completeSale({
                  date: new Date().toISOString(),
                  customerId: null,
                  items: posCart.map((i) => ({
                    id: `cart-item-${Date.now()}-${Math.random()}`,
                    product: i.product,
                    quantity: i.quantity,
                    selectedSize: i.size,
                    selectedColor:
                      i.color || productColors(i.product.colors)[0] || "",
                    unitPrice: getEffectiveUnitPrice(i),
                  })),
                  subtotal: cartTotal,
                  globalDiscountPercent: 0,
                  globalDiscountAmount: 0,
                  totalAmount: cartTotal,
                  paidAmount: cartTotal,
                  paymentMethod: "cash",
                  cashierName: currentUser?.username || "Unknown",
                });

                const newOrder = addOrder({
                  customerName: orderData.customerName,
                  customerPhone: orderData.customerPhone,
                  customerWilaya: orderData.customerWilaya || "بيع مباشر",
                  customerAddress: "المحل",
                  deliveryType: orderData.deliveryType,
                  items: orderData.items,
                  totalDZD: orderData.totalDZD,
                  isOnlineOrder: false,
                  deliveryFee: 0,
                  status: "مكتمل",
                  cashierName: orderData.cashierName,
                });
                toast.success("تم البيع بنجاح");
                if (autoPrint) {
                  setSelectedOrder(newOrder);
                  setIsInvoiceOpen(true);
                  setTimeout(() => window.print(), 600);
                }
              }

              setPosCart([]);
            }}
            editingOrder={editingOrder}
            cancelEdit={cancelEdit}
          />
        )}
        {activeTab === "catalog" && (
          <CatalogTab
            role={role}
            products={products}
            openAddModal={() => {
              setEditingProduct(null);
              setFormData({
                name: "",
                basePriceDZD: 0,
                costPriceDZD: 0,
                category: categories[0] || "",
                stock: {},
                sizePrices: {},
                sizeCostPrices: {},
                colors: [],
              });
              setIsAddModalOpen(true);
            }}
            openEditModal={(p) => {
              setEditingProduct(p);
              setFormData(p);
              setIsAddModalOpen(true);
            }}
            deleteProduct={deleteProduct}
            toggleProductPublished={toggleProductPublished}
            moveProduct={moveProduct}
          />
        )}
        {activeTab === "purchases" && (
          <PurchasesTab
            products={products}
            purchases={purchases}
            cancelPurchase={cancelPurchaseInvoice}
            openPurchaseModal={(p) => {
              setEditingPurchase(p || null);
              if (p?.items?.length) {
                const hydratedItems = preparePurchaseEditItems(
                  p.items,
                  products,
                  categorySizes,
                );
                const total = calcPurchaseTotal(hydratedItems);
                setPurchaseData({
                  ...p,
                  items: hydratedItems,
                  totalAmount: total > 0 ? total : p.totalAmount,
                  paidAmount: p.paidAmount ?? total,
                });
              } else {
                setPurchaseData(
                  p || {
                    items: [],
                    totalAmount: 0,
                    paidAmount: 0,
                    date: new Date().toISOString().split("T")[0],
                  },
                );
              }
              setIsPurchaseModalOpen(true);
            }}
            openInvoiceView={(p) => {
              setSelectedPurchaseInvoice(p);
              setIsPurchaseInvoiceViewOpen(true);
            }}
          />
        )}

        {activeTab === "orders" && (
          <OrdersTab
            role={role}
            orderSearch={orderSearch}
            setOrderSearch={setOrderSearch}
            orderTabFilter={orderTabFilter}
            setOrderTabFilter={setOrderTabFilter}
            orderDateFilter={orderDateFilter}
            setOrderDateFilter={setOrderDateFilter}
            filteredOrders={filterDashboardOrders(orders, {
              searchQuery: orderSearch,
              tabFilter: orderTabFilter,
              dateFilter: orderDateFilter,
              role,
              currentUser,
            })}
            updateStatus={updateOrderStatus}
            setSelectedOrder={setSelectedOrder}
            setIsInvoiceOpen={setIsInvoiceOpen}
            deleteOrder={deleteOrder}
            completeSaleFromOrder={completeSaleFromOrder}
            onEditOnlineOrder={openEditOnlineOrder}
            onEditStoreOrder={editOrderInPOS}
            openAddOrderModal={() => {
              setOrderToEdit(null);
              setEditOrderData({
                items: [],
                totalAmount: 0,
                totalDZD: 0,
                isOnlineOrder: true,
                deliveryType: "Yalidine",
                status: "قيد التحضير",
                customerWilaya: Object.keys(wilayaFees)[0] || "16 - Alger",
              });
              setIsEditOrderModalOpen(true);
            }}
          />
        )}
        {activeTab === "filters" && (
          <FiltersTab
            categorySizes={categorySizes}
            categories={categories}
            newFilterValues={newFilterValues}
            setNewFilterValues={setNewFilterValues}
            updateFilter={updateFilter as any}
            handleAddFilter={handleAddFilter as any}
          />
        )}
        {activeTab === "settings" && (
          <LogisticsTab
            role={role}
            wilayaFees={wilayaFees}
            wilayaCommunes={wilayaCommunes}
            renameWilaya={renameWilaya}
            updateWilayaFee={updateWilayaFee}
            deleteWilaya={deleteWilaya}
            newWilayaName={newWilayaName}
            setNewWilayaName={setNewWilayaName}
            newWilayaFee={newWilayaFee}
            setNewWilayaFee={setNewWilayaFee}
            addWilaya={addWilaya}
            setWilayaCommunesList={setWilayaCommunesList}
            restoreMissingWilayas={restoreMissingWilayas}
            updatePassword={updatePassword}
            hasRecoverySecretConfigured={hasRecoverySecretConfigured}
            setAdminRecoverySecret={setAdminRecoverySecret}
            globalReorderLevel={globalReorderLevel}
            setGlobalReorderLevel={setGlobalReorderLevel}
            suppliers={suppliers}
            addSupplier={addSupplier}
            deleteSupplier={deleteSupplier}
            purchases={purchases}
            settings={settings}
            updateSettings={updateSettings}
          />
        )}
        {activeTab === "users" && role === "admin" && (
          <UsersTab
            users={users}
            addUser={(u, p, r) => {
              void addUser(u, p, r as "employee" | "admin");
            }}
            deleteUser={deleteUser}
            orders={orders}
            setUserPassword={(id, p) => {
              void setUserPassword(id, p);
            }}
          />
        )}
      </main>
      <ProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        editingProduct={editingProduct}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSaveProduct}
        categorySizes={categorySizes}
        categories={categories}
        onOpenInvoice={(invoice) => {
          setSelectedPurchaseInvoice(invoice);
          setIsPurchaseInvoiceViewOpen(true);
        }}
      />
      <OrderModal
        isOpen={isEditOrderModalOpen}
        onClose={() => setIsEditOrderModalOpen(false)}
        order={orderToEdit}
        editData={editOrderData}
        setEditData={setEditOrderData}
        onSave={() => {
          const customerErrors = validateOrderCustomer({
            customerName: editOrderData.customerName,
            customerPhone: editOrderData.customerPhone,
            customerWilaya: editOrderData.customerWilaya,
            customerAddress: editOrderData.customerAddress,
          });
          if (Object.keys(customerErrors).length > 0) {
            toast.error(
              Object.values(customerErrors)[0] || "يرجى تصحيح بيانات العميل",
            );
            return;
          }
          if (!editOrderData.items?.length) {
            toast.error("أضف منتجاً واحداً على الأقل للطلبية");
            return;
          }
          const subtotal =
            editOrderData.items?.reduce(
              (sum, i) => sum + i.price * i.quantity,
              0,
            ) ?? 0;
          const delivery = editOrderData.deliveryFee ?? 0;
          const total = Math.max(0, subtotal + delivery);

          const finalOrder = {
            ...editOrderData,
            totalAmount: total,
            totalDZD: total,
            subtotal,
            date: editOrderData.date || orderToEdit?.date,
            orderNumber:
              editOrderData.orderNumber ||
              orderToEdit?.orderNumber ||
              `ORD-${Date.now().toString().slice(-6)}`,
            status: (editOrderData.status as OrderStatus) || "قيد التحضير",
            isOnlineOrder: editOrderData.isOnlineOrder !== false,
          } as Order;

          if (orderToEdit) {
            updateOrder(orderToEdit.id, finalOrder);
            toast.success("تم تحديث الطلبية");
          } else {
            addOrder({
              ...finalOrder,
              customerName: finalOrder.customerName || "زبون",
              customerPhone: finalOrder.customerPhone || "",
              customerWilaya: finalOrder.customerWilaya || "16 - Alger",
              deliveryType: finalOrder.deliveryType || "Yalidine",
            });
            toast.success("تم إضافة الطلبية بنجاح");
          }
          setIsEditOrderModalOpen(false);
        }}
        products={products}
        addItem={(p, s) => {
          const items = editOrderData.items || [];
          const price =
            getLowestSellingPriceBySize(p.id, s) ||
            getLowestSellingPrice(p.id) ||
            p.sizePrices?.[s] ||
            p.basePriceDZD ||
            0;
          const newItems = [
            ...items,
            {
              productId: p.id,
              productName: p.name,
              size: s,
              quantity: 1,
              price,
            },
          ];
          const subtotal = newItems.reduce(
            (sum, i) => sum + i.price * i.quantity,
            0,
          );
          setEditOrderData({
            ...editOrderData,
            items: newItems,
            subtotal,
            totalAmount: subtotal,
            totalDZD: subtotal,
          });
        }}
        removeItem={(idx) => {
          const items = editOrderData.items || [];
          const newItems = items.filter((_, i) => i !== idx);
          const subtotal = newItems.reduce(
            (sum, i) => sum + i.price * i.quantity,
            0,
          );
          setEditOrderData({
            ...editOrderData,
            items: newItems,
            subtotal,
            totalAmount: subtotal,
            totalDZD: subtotal,
          });
        }}
      />
      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        products={products}
        categorySizes={categorySizes}
        editingPurchase={editingPurchase}
        purchaseData={purchaseData}
        setPurchaseData={setPurchaseData}
        onSave={handlePurchaseSave}
        getVariantMinQty={
          editingPurchase?.id
            ? (productId) =>
                getProductVariantMinQty(
                  editingPurchase as import("@/adminFunctions/purchases").PurchaseInvoice,
                  batches,
                  productId,
                )
            : undefined
        }
      />
      <PurchaseInvoiceViewModal
        isOpen={isPurchaseInvoiceViewOpen}
        onClose={() => setIsPurchaseInvoiceViewOpen(false)}
        purchase={selectedPurchaseInvoice}
        products={products}
      />
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        order={selectedOrder}
      />
    </div>
  );
}
