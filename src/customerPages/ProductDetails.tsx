import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { ArrowRight, ShoppingCart, Zap, ZoomIn } from "lucide-react";
import { usePublicProducts } from "@/customerFunctions/usePublicProducts";
import { getPublicProducts, pickSimilarProducts } from "@/adminFunctions/productDisplay";
import { useBatches } from "@/adminFunctions/batches";
import { useCart } from "@/customerFunctions/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";
import { motion } from "framer-motion";
import { isStandardSize } from "@/adminFunctions/products";
import { getProductImageSrc } from "@/adminFunctions/products";
import { applyProductDiscount, hasProductDiscount } from "@/customerFunctions/productPricing";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products: allProducts } = usePublicProducts();
  const products = allProducts;
  const {
    batches,
    getLowestSellingPrice,
    getLowestSellingPriceBySize,
    getProductTotalStock,
    getProductStockBySize,
  } = useBatches();

  const product = products.find((p) => p.id === id);
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [zoomed, setZoomed] = useState(false);

  const color = selectedColor || product?.colors?.[0] || "";

  const sizesWithStock = useMemo(() => {
    if (!product) return [];
    return (product.sizes || []).map((s) => ({
      size: s,
      stock: getProductStockBySize(product.id, s, color || undefined),
    }));
  }, [product, batches, getProductStockBySize, color]);

  useEffect(() => {
    if (!product) return;
    const initialColor = product.colors?.[0] || "";
    setSelectedColor(initialColor);
    const firstAvailable = (product.sizes || []).find(
      (s) => getProductStockBySize(product.id, s, initialColor || undefined) > 0,
    );
    setSelectedSize(firstAvailable || product.sizes?.[0] || "");
  }, [product?.id, batches, getProductStockBySize]);

  useEffect(() => {
    if (!product || !selectedColor) return;
    const stockForSize = selectedSize
      ? getProductStockBySize(product.id, selectedSize, selectedColor)
      : 0;
    if (stockForSize <= 0) {
      const next = (product.sizes || []).find(
        (s) => getProductStockBySize(product.id, s, selectedColor) > 0,
      );
      if (next) setSelectedSize(next);
    }
  }, [selectedColor, product?.id, batches, getProductStockBySize]);

  const similar = useMemo(() => {
    if (!product) return [];
    return pickSimilarProducts(product, products, getLowestSellingPrice, 3);
  }, [product, products, batches, getLowestSellingPrice]);

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-2xl font-bold mb-4">المنتج غير موجود</h1>
        <Button asChild variant="outline">
          <Link to="/products">العودة للمنتجات</Link>
        </Button>
      </div>
    );
  }

  const basePrice =
    (selectedSize
      ? getLowestSellingPriceBySize(
          product.id,
          selectedSize,
          selectedColor || undefined,
        )
      : 0) || getLowestSellingPrice(product.id) || (product as any).basePriceDZD || 0;
  const price = applyProductDiscount(basePrice, product.discountPercent);
  const onSale = hasProductDiscount(product.discountPercent) && basePrice > 0;
  const availableStock = selectedSize
    ? getProductStockBySize(product.id, selectedSize, selectedColor || undefined)
    : 0;
  // Use batch stock if available, fall back to product.stock JSON field
  const batchStock = getProductTotalStock(product.id, product.sizes);
  const productStockField = (product as any).stock;
  const stockFromProduct = productStockField && typeof productStockField === "object"
    ? Object.values(productStockField as Record<string, any>).reduce((sum: number, v: any) => {
        if (typeof v === "number") return sum + v;
        if (typeof v === "object") return sum + Object.values(v as Record<string, number>).reduce((s, n) => s + (typeof n === "number" ? n : 0), 0);
        return sum;
      }, 0)
    : 0;
  const totalStock = batchStock > 0 ? batchStock : (stockFromProduct > 0 ? stockFromProduct : 1); // default 1 so customers can order
  const showSizePicker = (product.sizes || []).some((s) => !isStandardSize(s));

  const addToCart = (): boolean => {
    if (!selectedSize) {
      toast.error("اختر المقاس", { description: "يرجى اختيار مقاس قبل الإضافة" });
      return false;
    }
    if ((product.colors || []).length > 0 && !selectedColor) {
      toast.error("اختر اللون", { description: "يرجى اختيار لون قبل الإضافة" });
      return false;
    }
    if (availableStock <= 0) {
      toast.error("نفد المخزون", { description: "هذا المقاس غير متوفر حالياً" });
      return false;
    }
    addItem({
      product,
      quantity: 1,
      selectedSize,
      selectedColor: selectedColor || product.colors?.[0] || "",
      unitPrice: price,
    });
    return true;
  };

  const handleAdd = () => {
    if (addToCart()) {
      toast.success("تمت الإضافة ✓", {
        description: `${product.name} أُضيف إلى السلة`,
      });
    }
  };

  const handleBuyNow = () => {
    if (addToCart()) {
      navigate("/checkout");
    }
  };

  return (
    <div className="container page-section px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8"
      >
        <Link to="/" className="hover:text-accent transition-colors">
          الرئيسية
        </Link>
        <ArrowRight className="h-3 w-3 rotate-180" />
        <Link to="/products" className="hover:text-accent transition-colors">
          المنتجات
        </Link>
        <ArrowRight className="h-3 w-3 rotate-180" />
        <span className="text-foreground">{product.name}</span>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div
            className={`aspect-[3/4] rounded-xl overflow-hidden bg-secondary cursor-zoom-in relative group ${
              zoomed
                ? "fixed inset-0 z-50 rounded-none aspect-auto cursor-zoom-out flex items-center justify-center bg-foreground/90"
                : ""
            }`}
            onClick={() => setZoomed(!zoomed)}
          >
            <img
              src={getProductImageSrc(product.image)}
              alt={product.name}
              className={`${
                zoomed
                  ? "max-h-[90vh] w-auto object-contain"
                  : "w-full h-full object-cover"
              } transition-transform duration-500`}
            />
            {!zoomed && (
              <div className="absolute bottom-3 left-3 bg-card/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-4 w-4 text-foreground" />
              </div>
            )}
          </div>
          {product.discountPercent > 0 && !zoomed && (
            <div className="absolute top-4 left-4 gold-gradient text-accent-foreground text-sm font-bold px-4 py-1.5 rounded-full">
              خصم {product.discountPercent}%
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            {product.name}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            {onSale && (
              <span className="text-lg text-muted-foreground line-through">
                {basePrice.toLocaleString()} دج
              </span>
            )}
            <span className="text-3xl font-bold text-accent">
              {basePrice > 0 ? `${price.toLocaleString()} دج` : "—"}
            </span>
            {hasProductDiscount(product.discountPercent) && basePrice <= 0 && (
              <span className="text-sm text-muted-foreground">
                السعر يظهر بعد إضافة دفعة شراء من المشتريات
              </span>
            )}
          </div>
          <p className="text-muted-foreground leading-relaxed text-lg">
            {product.description}
          </p>

          <div className="bg-secondary/50 rounded-xl p-4">
            <h4 className="font-bold text-foreground mb-1">نوع المنتج</h4>
            <p className="text-muted-foreground">{product.category}</p>
          </div>

          {showSizePicker && (
            <div>
              <h4 className="font-bold text-foreground mb-3">المقاس</h4>
              <div className="flex flex-wrap gap-2">
                {sizesWithStock.map(({ size: s, stock }) => {
                  const outOfStock = stock <= 0;
                  const isSelected = selectedSize === s;
                  return (
                    <motion.button
                      key={s}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedSize(s)}
                      className={`w-14 h-14 rounded-xl border-2 text-sm font-bold transition-all duration-200 ${
                        isSelected && outOfStock
                          ? "border-red-500 bg-red-50 text-red-700 shadow-md"
                          : isSelected
                            ? "gold-gradient text-accent-foreground border-transparent shadow-md"
                            : outOfStock
                              ? "border-red-300 bg-red-50/80 text-red-600 hover:border-red-400"
                              : "border-border text-foreground hover:border-accent"
                      }`}
                    >
                      {s}
                    </motion.button>
                  );
                })}
              </div>
              {availableStock <= 0 && selectedSize && (
                <p className="text-sm text-red-600 font-medium mt-2">
                  المقاس {selectedSize} غير متوفر — اختر مقاساً آخر
                </p>
              )}
            </div>
          )}

          {(product.colors || []).length > 0 && (
            <div>
              <h4 className="font-bold text-foreground mb-3">اللون</h4>
              <div className="flex flex-wrap gap-2">
                {(product.colors || []).map((c) => {
                  const hasAnyStock = true; // stock managed in local dashboard
                  return (
                  <motion.button
                    key={c}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedColor(c)}
                    disabled={!hasAnyStock}
                    className={`px-5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 ${
                      selectedColor === c
                        ? "gold-gradient text-accent-foreground border-transparent shadow-md"
                        : !hasAnyStock
                          ? "border-red-200 bg-red-50/50 text-red-400 cursor-not-allowed opacity-70"
                          : "border-border text-foreground hover:border-accent"
                    }`}
                  >
                    {c}
                  </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <motion.div className="flex-1 w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                size="lg"
                className="w-full gold-gradient border-0 text-foreground font-bold text-base min-h-[48px]"
                onClick={handleAdd}
                disabled={false}
              >
                <ShoppingCart className="ml-2 h-5 w-5" />
                أضف إلى السلة
              </Button>
            </motion.div>
            <motion.div className="flex-1 w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground min-h-[48px]"
                onClick={handleBuyNow}
                disabled={false}
              >
                <Zap className="ml-2 h-5 w-5" />
                اشترِ الآن
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {similar.length > 0 && (
        <motion.section
          className="mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
            منتجات مشابهة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similar.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
