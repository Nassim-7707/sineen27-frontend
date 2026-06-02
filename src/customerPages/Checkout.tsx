import { useState, useEffect, useMemo } from "react";
import { useCart, cartItemKey } from "@/customerFunctions/cart";
import { calcOrderSubtotal, calcOrderTotal } from "@/customerFunctions/checkoutCalculations";
import { isStandardSize } from "@/adminFunctions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Banknote } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useOrders } from "@/adminFunctions/orders";
import FormField, { fieldErrorClass } from "@/components/FormField";
import {
  validateCheckoutForm,
  validateCheckoutField,
  formatAlgerianPhoneInput,
  formatFullNameInput,
  blockNonNumericKeys,
  type CheckoutField,
  type CheckoutFormData,
  type FieldErrors,
} from "@/adminFunctions/validation";
import { cn } from "@/components/utils";
import { getProductImageSrc } from "@/adminFunctions/products";
import { toast } from "sonner";

export default function Checkout() {
  const { items, clearCart } = useCart();
  const { addOrder, wilayaFees, wilayaCommunes } = useOrders();

  const wilayaList = useMemo(
    () => Object.keys(wilayaFees).sort(),
    [wilayaFees],
  );

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>({
    name: "",
    phone: "",
    commune: "",
    wilaya: "",
  });
  const [errors, setErrors] = useState<FieldErrors<CheckoutField>>({});
  const [touched, setTouched] = useState<Partial<Record<CheckoutField, boolean>>>({});

  useEffect(() => {
    if (wilayaList.length === 0) return;
    setFormData((prev) => {
      const wilaya = wilayaList.includes(prev.wilaya) ? prev.wilaya : wilayaList[0];
      const communes = wilayaCommunes[wilaya] || [];
      const commune =
        communes.includes(prev.commune) && prev.commune
          ? prev.commune
          : communes[0] || "";
      return { ...prev, wilaya, commune };
    });
  }, [wilayaList, wilayaCommunes]);

  const deliveryFee = wilayaFees[formData.wilaya] ?? 0;
  const subtotal = calcOrderSubtotal(items);
  const finalTotal = calcOrderTotal(subtotal, deliveryFee);

  const blurField = (field: CheckoutField) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const msg = validateCheckoutField(field, formData);
    setErrors((e) => {
      const next = { ...e };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  };

  const updateField = <K extends CheckoutField>(
    field: K,
    value: CheckoutFormData[K],
  ) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    if (touched[field]) {
      const msg = validateCheckoutField(field, next);
      setErrors((e) => {
        const copy = { ...e };
        if (msg) copy[field] = msg;
        else delete copy[field];
        return copy;
      });
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="container page-section text-center px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
        >
          <CheckCircle className="h-16 w-16 sm:h-24 sm:w-24 mx-auto text-accent mb-4 sm:mb-6" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3"
        >
          تم تأكيد طلبك بنجاح! 🎉
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-muted-foreground mb-8 text-base sm:text-lg max-w-md mx-auto"
        >
          شكراً لك. سنتواصل معك قريباً لتأكيد تفاصيل الشحن.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <Button asChild className="gold-gradient border-0 text-foreground font-bold w-full sm:w-auto">
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container page-section text-center px-4">
        <h1 className="font-heading text-xl sm:text-2xl font-bold mb-4">السلة فارغة</h1>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/products">تصفح المنتجات</Link>
        </Button>
      </div>
    );
  }

  if (wilayaList.length === 0) {
    return (
      <div className="container page-section text-center px-4">
        <h1 className="font-heading text-xl sm:text-2xl font-bold mb-4">
          التوصيل غير متاح حالياً
        </h1>
        <p className="text-muted-foreground mb-6">
          يرجى التواصل مع المتجر — لم تُضبط الولايات في لوحة التحكم بعد.
        </p>
        <Button asChild variant="outline">
          <Link to="/cart">العودة للسلة</Link>
        </Button>
      </div>
    );
  }

  const communeOptions = wilayaCommunes[formData.wilaya] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allErrors = validateCheckoutForm(formData);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setTouched({
        name: true,
        phone: true,
        wilaya: true,
        commune: true,
      });
      toast.error("يرجى تصحيح الحقول المشار إليها");
      return;
    }
    addOrder({
      customerName: formData.name.trim(),
      customerPhone: formData.phone,
      customerWilaya: formData.wilaya,
      customerAddress: formData.commune,
      deliveryType: "Yalidine",
      items: items.map((i) => ({
        productName: i.product.name,
        productId: i.product.id,
        quantity: i.quantity,
        size: i.selectedSize,
        color: i.selectedColor,
        price: i.unitPrice,
      })),
      subtotal,
      totalDZD: finalTotal,
      totalAmount: finalTotal,
      isOnlineOrder: true,
      deliveryFee,
    });
    clearCart();
    setSubmitted(true);
  };

  const showError = (field: CheckoutField) => touched[field] && errors[field];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container page-section px-4">
      <h1 className="page-title mb-6 sm:mb-8">إتمام الشراء</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="order-1 lg:order-2 bg-card rounded-xl border border-border p-4 sm:p-6 h-fit lg:sticky lg:top-20 space-y-4"
        >
          <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">ملخص الطلب</h2>
          <div className="space-y-3 max-h-[40vh] lg:max-h-none overflow-y-auto">
            {items.map((item) => (
              <div key={cartItemKey(item)} className="flex gap-3 border-b border-border pb-3">
                <img
                  src={getProductImageSrc(item.product.image)}
                  alt={item.product.name}
                  className="w-14 h-[4.5rem] sm:w-16 sm:h-20 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm line-clamp-2">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.selectedSize && !isStandardSize(item.selectedSize) ? `${item.selectedSize} | ` : ""}
                    {item.selectedColor} × {item.quantity}
                  </p>
                </div>
                <span className="font-bold text-accent text-sm shrink-0">
                  {(item.unitPrice * item.quantity).toLocaleString()} دج
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex justify-between text-sm gap-2">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span className="font-medium">{subtotal.toLocaleString()} دج</span>
            </div>
            <div className="flex justify-between text-sm gap-2">
              <span className="text-muted-foreground text-right">سعر التوصيل</span>
              <span className="font-medium shrink-0">{deliveryFee.toLocaleString()} دج</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{formData.wilaya}</p>
            <div className="flex justify-between font-bold text-foreground text-lg sm:text-xl pt-2 border-t border-border/50">
              <span>الإجمالي الكلي</span>
              <span className="text-accent">{finalTotal.toLocaleString()} دج</span>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="order-2 lg:order-1 space-y-6" noValidate>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-4">بيانات الشحن</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="الاسم الكامل"
                required
                error={showError("name")}
                className="sm:col-span-2"
              >
                <Input
                  placeholder="محمد أحمد"
                  className={cn("mt-0 h-11 text-base sm:text-sm", fieldErrorClass(!!showError("name")))}
                  value={formData.name}
                  onChange={(e) => updateField("name", formatFullNameInput(e.target.value))}
                  onBlur={() => blurField("name")}
                  onKeyDown={(e) => {
                    if (/^\d$/.test(e.key)) e.preventDefault();
                  }}
                  aria-invalid={!!showError("name")}
                  maxLength={60}
                />
              </FormField>

              <FormField
                label="رقم الهاتف"
                required
                error={showError("phone")}
                hint="10 أرقام تبدأ بـ 05 أو 06 أو 07"
                className="sm:col-span-2"
              >
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="0555123456"
                  className={cn("mt-0 h-11 text-base sm:text-sm font-sans", fieldErrorClass(!!showError("phone")))}
                  value={formData.phone}
                  onChange={(e) => updateField("phone", formatAlgerianPhoneInput(e.target.value))}
                  onBlur={() => blurField("phone")}
                  onKeyDown={blockNonNumericKeys}
                  aria-invalid={!!showError("phone")}
                  maxLength={10}
                />
              </FormField>

              <FormField label="الولاية" required error={showError("wilaya")}>
                <select
                  className={cn("select-field mt-0", showError("wilaya") && "select-field-error")}
                  value={formData.wilaya}
                  onChange={(e) => {
                    const newWilaya = e.target.value;
                    const communes = wilayaCommunes[newWilaya] || [];
                    const next = {
                      ...formData,
                      wilaya: newWilaya,
                      commune: communes[0] || "",
                    };
                    setFormData(next);
                    if (touched.wilaya) {
                      const msg = validateCheckoutField("wilaya", next);
                      setErrors((er) => {
                        const copy = { ...er };
                        if (msg) copy.wilaya = msg;
                        else delete copy.wilaya;
                        return copy;
                      });
                    }
                  }}
                  onBlur={() => blurField("wilaya")}
                >
                  {wilayaList.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="البلدية" required error={showError("commune")}>
                <select
                  className={cn("select-field mt-0", showError("commune") && "select-field-error")}
                  value={formData.commune}
                  onChange={(e) => updateField("commune", e.target.value)}
                  onBlur={() => blurField("commune")}
                  disabled={communeOptions.length === 0}
                >
                  {communeOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground pt-2 mb-4">طريقة الدفع</h2>
            <div className="p-4 rounded-xl border-2 border-border flex items-center gap-3 bg-secondary/20">
              <Banknote className="h-6 w-6 text-accent shrink-0" />
              <span className="text-base sm:text-lg font-medium">الدفع عند التسليم</span>
            </div>
          </motion.div>

          <Button
            type="submit"
            size="lg"
            className="w-full gold-gradient border-0 text-foreground font-bold text-base sm:text-lg py-6 min-h-[52px]"
          >
            إتمام الشراء — {finalTotal.toLocaleString()} دج
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
