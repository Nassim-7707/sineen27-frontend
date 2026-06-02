import { useState } from "react";
import { useProducts } from "@/adminFunctions/products";
import { getFilteredProducts } from "@/customerFunctions/productFilters";
import ProductCard from "@/components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";

export default function Products() {
  const { products = [], categories = [] } = useProducts() || {};
  const [category, setCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = getFilteredProducts(products, category);

  return (
    <div className="container page-section px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">المنتجات</h1>
        <p className="text-muted-foreground mb-8">تصفح تشكيلتنا الكاملة من العباءات الرجالية</p>
      </motion.div>

      {/* Filter toggle for mobile */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="md:hidden flex items-center gap-2 mb-4 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium"
      >
        <SlidersHorizontal className="h-4 w-4" />
        فلترة المنتجات
      </button>

      {/* Filters */}
      <motion.div
        className={`space-y-4 mb-8 ${showFilters ? "block" : "hidden md:block"}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div>
          <span className="text-sm font-medium text-foreground mb-2 block">نوع المنتج</span>
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCategory("")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                category === ""
                  ? "gold-gradient text-accent-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-accent/10 hover:border-accent"
              }`}
            >
              الكل
            </motion.button>
            {categories.map((c) => (
              <motion.button
                key={c}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  category === c
                    ? "gold-gradient text-accent-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-accent/10 hover:border-accent"
                }`}
              >
                {c}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={category}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </motion.div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-muted-foreground py-16"
        >
          لا توجد منتجات تطابق الفلاتر المحددة
        </motion.p>
      )}
    </div>
  );
}
