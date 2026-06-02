import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge, Input, Card } from "./dashboard-ui";

interface FiltersTabProps {
  categorySizes: Record<string, string[]>;
  categories: string[];
  newFilterValues: any;
  setNewFilterValues: (v: any) => void;
  updateFilter: (type: 'categorySizes' | 'categories', action: 'add' | 'remove', val: string, category?: string) => void;
  handleAddFilter: (type: 'categorySizes' | 'categories', category?: string) => void;
}

export default function FiltersTab({
  categorySizes, categories, newFilterValues, setNewFilterValues, updateFilter, handleAddFilter
}: FiltersTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || "");
  const currentSizes = categorySizes[selectedCategory] || [];
  return (
    <div className="dashboard-page text-right">
       <header className="dashboard-page-header">
          <div>
             <h1 className="dash-page-title">الفلاتر</h1>
             <p className="dash-caption mt-1">المقاسات والأنواع</p>
          </div>
       </header>

       <div className="dashboard-grid-2">
          {/* Sizes Management */}
          <Card className="dashboard-card space-y-6">
             <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h3 className="dash-section-title">المقاسات</h3>
                <select 
                   value={selectedCategory} 
                   onChange={e => setSelectedCategory(e.target.value)}
                   className="dashboard-select h-10 px-4 rounded-xl font-bold"
                >
                   {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
             
             {categories.length === 0 ? (
                <p className="text-muted-foreground text-sm font-bold">يرجى إضافة أنواع المنتجات أولاً</p>
             ) : (
                <>
                   <div className="flex flex-wrap gap-2">
                      {currentSizes.length === 0 && <span className="text-muted-foreground text-xs">لا توجد أحجام مخصصة لهذا النوع...</span>}
                      {currentSizes.map(s => (
                        <Badge key={s} className="bg-muted text-foreground border-0 py-2 px-4 flex items-center gap-2 rounded-xl group transition-all hover:bg-destructive/10 hover:text-destructive">
                           {s}
                           <button onClick={() => updateFilter('categorySizes', 'remove', s, selectedCategory)}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                   </div>
                   <div className="flex gap-2">
                      <Input placeholder={`إضافة مقاس لـ ${selectedCategory}...`} value={newFilterValues.categorySizes || ""} onChange={e => setNewFilterValues({...newFilterValues, categorySizes: e.target.value})} className="saneen-input h-12" />
                      <button onClick={() => handleAddFilter('categorySizes', selectedCategory)} className="dashboard-btn-primary px-6 rounded-xl"><Plus className="h-4 w-4" /></button>
                   </div>
                </>
             )}
          </Card>

          {/* Categories Management */}
          <Card className="dashboard-card space-y-6">
             <h3 className="dash-section-title border-b border-border/60 pb-4">الأنواع</h3>
             <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <Badge key={c} className="bg-gold/10 text-gold-foreground border-0 py-2 px-4 flex items-center gap-2 rounded-xl group transition-all hover:bg-destructive/10 hover:text-destructive">
                     {c}
                     <button onClick={() => updateFilter('categories', 'remove', c)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
             </div>
             <div className="flex gap-2">
                <Input placeholder="إضافة نوع جديد..." value={newFilterValues.categories} onChange={e => setNewFilterValues({...newFilterValues, categories: e.target.value})} className="saneen-input h-12" />
                <button onClick={() => handleAddFilter('categories')} className="dashboard-btn-primary px-6 rounded-xl"><Plus className="h-4 w-4" /></button>
             </div>
          </Card>
       </div>
    </div>
  );
}
