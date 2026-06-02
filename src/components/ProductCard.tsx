import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ShoppingCart, Eye, X } from "lucide-react";
import { Product } from "@/adminFunctions/products";
import { useBatches } from "@/adminFunctions/batches";
import { useCart } from "@/customerFunctions/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { isStandardSize, sizeLabel } from "@/adminFunctions/products";
import { getProductImageSrc } from "@/adminFunctions/products";
import { applyProductDiscount, hasProductDiscount } from "@/customerFunctions/productPricing";

export default function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  const {
    getLowestSellingPrice,
    getLowestSellingPriceBySize,
    getProductTotalStock,
    getProductStockBySize,
  } = useBatches();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const basePrice = getLowestSellingPrice(product.id) || 0;
  const price = applyProductDiscount(basePrice, product.discountPercent);
  const onSale = hasProductDiscount(product.discountPercent) && basePrice > 0;
  const totalStock = getProductTotalStock(product.id, product.sizes);
  const [showSizes, setShowSizes] = useState(false);

  const productSizes = product.sizes || [];

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalStock <= 0) {
      toast.error("نفد المخزون", { description: "هذا المنتج غير متوفر حالياً" });
      return;
    }
    if (productSizes.length === 1 && isStandardSize(productSizes[0])) {
      handleSizeSelect(e, productSizes[0]);
      return;
    }
    setShowSizes(!showSizes);
  };

  const pickColorForSize = (size: string) => {
    const palette = product.colors || [];
    const inStock = palette.find(
      (c) => getProductStockBySize(product.id, size, c) > 0,
    );
    return inStock || palette[0] || "";
  };

  const handleSizeSelect = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    const color = pickColorForSize(size);
    const stock = getProductStockBySize(product.id, size, color || undefined);
    if (stock <= 0) {
      toast.error("نفد المخزون", {
        description: `المقاس ${isStandardSize(size) ? "القطعة" : size} غير متوفر`,
      });
      return;
    }

    const rawPrice =
      getLowestSellingPriceBySize(product.id, size, color || undefined) ||
      getLowestSellingPrice(product.id) ||
      0;
    const unitPrice = applyProductDiscount(rawPrice, product.discountPercent);

    addItem({
      product,
      quantity: 1,
      selectedSize: size,
      selectedColor: color,
      unitPrice,
    });

    toast.success("تمت الإضافة ✓", {
      description: `${product.name}${!isStandardSize(size) ? ` (مقاس ${size})` : ""} أُضيف إلى السلة`,
    });
    setShowSizes(false);
    navigate("/cart");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="h-full"
    >
      <Link to={`/product/${product.id}`} className="group flex flex-col h-full">
        <div className="bg-card rounded-xl overflow-hidden border border-border flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-accent/30">
          <div className="aspect-[3/4] overflow-hidden relative">
            <img
              src={getProductImageSrc(product.image)}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />

            {showSizes && (
              <div
                className="absolute inset-0 bg-card/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSizes(false);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary text-muted-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
                <h4 className="font-bold text-foreground mb-3 text-sm">اختر المقاس</h4>
                <div className="grid grid-cols-3 gap-2 w-full">
                  {productSizes.map((size) => {
                    const stock = getProductStockBySize(
                      product.id,
                      size,
                      pickColorForSize(size) || undefined,
                    );
                    const outOfStock = stock <= 0;
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={outOfStock}
                        onClick={(e) => handleSizeSelect(e, size)}
                        className={`py-2 px-1 text-sm font-bold border rounded-lg transition-all ${outOfStock
                          ? "border-red-300 bg-red-50 text-red-500 cursor-not-allowed opacity-80"
                          : "border-border hover:border-accent hover:text-accent hover:bg-accent/5"
                          }`}
                      >
                        {isStandardSize(size) ? "إضافة" : size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ opacity: 1, scale: 1 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div className="bg-card/90 backdrop-blur-sm rounded-full p-3">
                  <Eye className="h-5 w-5 text-foreground" />
                </div>
              </motion.div>
            </div>

            {onSale && (
              <div className="absolute top-4 left-4 gold-gradient text-accent-foreground text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                −{product.discountPercent}%
              </div>
            )}
            {totalStock === 0 && (
              <div
                className={`absolute ${onSale ? "top-12" : "top-4"} left-4 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border border-white/20 bg-red-600`}
              >
                نفد المخزون
              </div>
            )}
          </div>

          <div className="p-4 flex flex-col flex-1 justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground leading-snug group-hover:text-accent transition-colors line-clamp-2 min-h-[3rem]">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">{product.category}</p>
              {totalStock > 0 && productSizes.some((s) => !isStandardSize(s)) && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {productSizes.map((s) => {
                    const qty = getProductStockBySize(product.id, s);
                    if (qty <= 0) return null;
                    return (
                      <span
                        key={s}
                        className="text-[9px] font-bold bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-md border border-border"
                      >
                        {sizeLabel(s)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex flex-col items-start gap-0.5">
                {onSale && (
                  <span className="text-sm text-muted-foreground line-through">
                    {basePrice.toLocaleString()} دج
                  </span>
                )}
                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-accent">
                  {basePrice > 0 ? `${price.toLocaleString()} دج` : "—"}
                </span>
                {onSale && basePrice <= 0 && (
                  <span className="text-xs text-muted-foreground">أضف مخزوناً من المشتريات</span>
                )}
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-110"
                onClick={handleAddClick}
                disabled={totalStock === 0}
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
