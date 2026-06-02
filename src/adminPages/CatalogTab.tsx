import {
  Edit,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Badge } from "./dashboard-ui";
import { Product } from "@/adminFunctions/products";
import { useBatches } from "@/adminFunctions/batches";
import { getProductImageSrc } from "@/adminFunctions/products";
import { getAdminCatalogProducts } from "@/adminFunctions/productDisplay";
import { toast } from "sonner";

interface CatalogTabProps {
  products: Product[];
  openAddModal: () => void;
  openEditModal: (p: Product) => void;
  deleteProduct: (id: string) => void;
  toggleProductPublished: (id: string) => void;
  moveProduct: (id: string, direction: "up" | "down") => void;
  role: string | null;
}

export default function CatalogTab({
  products,
  openAddModal,
  openEditModal,
  deleteProduct,
  toggleProductPublished,
  moveProduct,
}: CatalogTabProps) {
  const { getLowestSellingPrice, getProductTotalStock } = useBatches();
  const catalog = getAdminCatalogProducts(products);

  const handleTogglePublish = (p: Product) => {
    toggleProductPublished(p.id);
    toast.success(
      p.isPublished ? "تم إخفاء المنتج من الموقع" : "تم إظهار المنتج في الموقع",
    );
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <h1 className="dash-page-title">المنتجات</h1>
          <p className="dash-caption mt-1">
            ترتيب الظهور في الموقع · إظهار أو إخفاء المنتجات
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="dashboard-btn-accent"
        >
          منتج جديد <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="dashboard-grid-3 pb-4">
        {catalog.map((p, index) => {
          const price = getLowestSellingPrice(p.id) || 0;
          const totalStock = getProductTotalStock(p.id, p.sizes);
          const isFirst = index === 0;
          const isLast = index === catalog.length - 1;

          return (
            <div
              key={p.id}
              className={`dashboard-card-hover group overflow-hidden p-0 ${
                !p.isPublished ? "opacity-75" : ""
              }`}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                <img
                  src={getProductImageSrc(p.image)}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={p.name}
                />

                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                  <Badge className="bg-charcoal/85 text-primary-foreground border-0 font-bold px-2.5 py-1 rounded-lg text-xs">
                    #{index + 1}
                  </Badge>
                  <Badge className="bg-card/90 backdrop-blur text-foreground border-0 font-bold px-3 py-1.5 rounded-lg shadow-sm text-xs">
                    {p.category}
                  </Badge>
                  {!p.isPublished && (
                    <Badge className="bg-destructive/90 text-destructive-foreground border-0 text-xs">
                      مخفي
                    </Badge>
                  )}
                </div>

                <div className="absolute inset-0 bg-charcoal/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
                  <button
                    type="button"
                    onClick={() => openEditModal(p)}
                    className="h-14 w-14 bg-card rounded-2xl flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all shadow-xl"
                  >
                    <Edit className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("هل تريد حذف هذا المنتج نهائياً؟"))
                        deleteProduct(p.id);
                    }}
                    className="h-14 w-14 bg-card text-destructive rounded-2xl flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-all shadow-xl"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-3 border-t border-border/50 bg-card">
                <div className="flex justify-between items-start gap-3">
                  <h4 className="text-base sm:text-lg font-black leading-tight text-foreground">
                    {p.name}
                  </h4>
                  <div className="text-sm font-black text-foreground shrink-0">
                    {price.toLocaleString()} دج
                  </div>
                </div>

                <div className="flex justify-between items-center py-2.5 px-4 bg-secondary rounded-xl border border-border/50 text-xs">
                  <span className="text-muted-foreground font-bold">المخزون</span>
                  <span className="font-black text-foreground">{totalStock} قطعة</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(p)}
                    className={`col-span-2 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-colors ${
                      p.isPublished
                        ? "bg-secondary text-foreground hover:bg-muted"
                        : "gold-gradient text-foreground"
                    }`}
                  >
                    {p.isPublished ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        إخفاء من الموقع
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        إظهار في الموقع
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => moveProduct(p.id, "up")}
                    className="flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-bold bg-secondary hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    title="تقديم في الترتيب"
                  >
                    <ChevronUp className="h-4 w-4" />
                    أحدث
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => moveProduct(p.id, "down")}
                    className="flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-bold bg-secondary hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    title="تأخير في الترتيب"
                  >
                    <ChevronDown className="h-4 w-4" />
                    أقدم
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
