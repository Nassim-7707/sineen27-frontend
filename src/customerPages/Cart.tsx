import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { useCart, cartItemKey } from "@/customerFunctions/cart";
import { isStandardSize } from "@/adminFunctions/products";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { getProductImageSrc } from "@/adminFunctions/products";

export default function Cart() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container page-section text-center px-4"
      >
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <ShoppingCart className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-muted-foreground mb-4" />
        </motion.div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold mb-2">السلة فارغة</h1>
        <p className="text-muted-foreground mb-6">لم تضف أي منتجات بعد</p>
        <Button asChild className="gold-gradient border-0 text-foreground font-bold w-full sm:w-auto max-w-xs">
          <Link to="/products">تصفح المنتجات</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container page-section px-4">
      <h1 className="page-title mb-6 sm:mb-8">سلة التسوق</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <AnimatePresence>
            {items.map((item) => {
              const key = cartItemKey(item);
              return (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="bg-card rounded-xl border border-border p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
                    <img
                      src={getProductImageSrc(item.product.image)}
                      alt={item.product.name}
                      className="w-20 h-24 sm:w-24 sm:h-32 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
                      <h3 className="font-heading font-bold text-foreground text-base sm:text-lg line-clamp-2">
                        {item.product.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {item.selectedSize && !isStandardSize(item.selectedSize)
                          ? `المقاس: ${item.selectedSize} | `
                          : ""}
                        {item.selectedColor ? `اللون: ${item.selectedColor}` : ""}
                      </p>
                      <p className="font-bold text-accent text-base sm:text-lg">
                        {item.unitPrice.toLocaleString()} دج
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => updateQuantity(key, item.quantity - 1)}
                        className="touch-target h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                        aria-label="تقليل الكمية"
                      >
                        <Minus className="h-3 w-3" />
                      </motion.button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => updateQuantity(key, item.quantity + 1)}
                        className="touch-target h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                        aria-label="زيادة الكمية"
                      >
                        <Plus className="h-3 w-3" />
                      </motion.button>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => removeItem(key)}
                      className="touch-target text-destructive hover:text-destructive/80 transition-colors p-2 flex items-center gap-1 text-sm"
                      aria-label="حذف المنتج"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sm:hidden">حذف</span>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="order-1 lg:order-2 bg-card rounded-xl border border-border p-4 sm:p-6 h-fit lg:sticky lg:top-20 space-y-4"
        >
          <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">ملخص الطلب</h3>
          <div className="flex justify-between text-muted-foreground text-sm sm:text-base">
            <span>المجموع الفرعي</span>
            <span className="font-medium">{totalPrice.toLocaleString()} دج</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-sm sm:text-base">
            <span>الشحن</span>
            <span className="text-accent font-medium">يُحسب عند الدفع</span>
          </div>
          <div className="border-t border-border pt-4 flex justify-between font-bold text-foreground text-lg sm:text-xl">
            <span>الإجمالي التقديري</span>
            <span className="text-accent">{totalPrice.toLocaleString()} دج</span>
          </div>

          <Button
            asChild
            size="lg"
            className="w-full gold-gradient border-0 text-foreground font-bold text-base min-h-[48px]"
          >
            <Link to="/checkout">إتمام الشراء</Link>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
