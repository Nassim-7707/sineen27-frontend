import { useState, useMemo } from "react";
import {
  Save, Trash2, Plus, Package, Truck, MapPin,
  Lock, Phone, Store, RotateCcw, Building2, ShieldCheck, AlertTriangle,
} from "lucide-react";
import {
  ADMIN_RECOVERY_QUESTION,
  ADMIN_RECOVERY_QUESTION_HINT,
  RECOVERY_ANSWER_MIN_LENGTH,
  RECOVERY_ANSWER_MAX_LENGTH,
} from "@/adminFunctions/auth";
import { WILAYA_COUNT } from "@/adminFunctions/communes";
import type { StoreSettings } from "@/adminFunctions/storeSettings";
import type { Supplier } from "@/adminFunctions/suppliers";
import type { PurchaseInvoice } from "@/adminFunctions/purchases";
import { Badge, Input } from "./dashboard-ui";
import { toast } from "sonner";
import {
  validatePasswordChange,
  PASSWORD_REQUIREMENTS_HINT,
  validateWilayaFee,
  validateReorderLevel,
  validateSupplierName,
  validatePhone,
  validateStorePhone,
  formatPriceInput,
  formatAlgerianPhoneInput,
  formatStorePhoneInput,
  blockNonNumericKeys,
} from "@/adminFunctions/validation";

interface Props {
  role: string | null;
  wilayaFees: Record<string, number>;
  wilayaCommunes: Record<string, string[]>;
  renameWilaya: (old: string, next: string) => void;
  updateWilayaFee: (name: string, fee: number) => void;
  deleteWilaya: (name: string) => void;
  newWilayaName: string;
  setNewWilayaName: (v: string) => void;
  newWilayaFee: number;
  setNewWilayaFee: (v: number) => void;
  addWilaya: (n: string, f: number) => void;
  setWilayaCommunesList: (wilaya: string, communes: string[]) => void;
  restoreMissingWilayas: () => number;
  updatePassword: (oldP: string, newP: string) => Promise<void>;
  hasRecoverySecretConfigured: () => boolean;
  setAdminRecoverySecret: (answer: string, currentPassword: string) => Promise<void>;
  globalReorderLevel: number;
  setGlobalReorderLevel: (v: number) => void;
  suppliers: Supplier[];
  addSupplier: (s: Omit<Supplier, "id">) => void;
  deleteSupplier: (id: string) => { success: boolean; error?: string };
  purchases: PurchaseInvoice[];
  settings: StoreSettings;
  updateSettings: (partial: Partial<StoreSettings>) => void;
}

export default function LogisticsTab(props: Props) {
  const {
    role, wilayaFees, wilayaCommunes, renameWilaya, updateWilayaFee,
    deleteWilaya, newWilayaName, setNewWilayaName, newWilayaFee, setNewWilayaFee,
    addWilaya, setWilayaCommunesList, restoreMissingWilayas, updatePassword,
    hasRecoverySecretConfigured, setAdminRecoverySecret, globalReorderLevel,
    setGlobalReorderLevel, suppliers, addSupplier, deleteSupplier, purchases,
    settings, updateSettings,
  } = props;

  const isAdmin = role === "admin";

  // Password state
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<{ old?: string; new?: string; confirm?: string }>({});

  // Recovery state
  const [recoveryForm, setRecoveryForm] = useState({ answer: "", confirmAnswer: "", currentPassword: "" });
  const [isSavingRecovery, setIsSavingRecovery] = useState(false);
  const [recoverySaved, setRecoverySaved] = useState(false);
  const recoveryConfigured = hasRecoverySecretConfigured() || recoverySaved;

  // Store info state
  const [storePhone, setStorePhone] = useState(settings.companyPhone || "");
  const [storeWhatsApp, setStoreWhatsApp] = useState(settings.companyWhatsApp || "");

  // Supplier state
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");

  // Wilaya / commune state
  const sortedWilayas = useMemo(() => Object.keys(wilayaFees).sort(), [wilayaFees]);
  const [selectedWilaya, setSelectedWilaya] = useState(() => sortedWilayas[0] || "");
  const [newCommuneName, setNewCommuneName] = useState("");

  const communesForSelected = (selectedWilaya && wilayaCommunes[selectedWilaya]) || [];
  const wilayaCount = Object.keys(wilayaFees).length;
  const missingWilayas = WILAYA_COUNT - wilayaCount;

  function handleAddSupplier() {
    const nameCheck = validateSupplierName(newSupplierName);
    if (!nameCheck.valid) { toast.error(nameCheck.message); return; }
    if (newSupplierPhone) {
      const phoneCheck = validatePhone(newSupplierPhone);
      if (!phoneCheck.valid) { toast.error(phoneCheck.message); return; }
    }
    addSupplier({ name: newSupplierName.trim(), phone: newSupplierPhone });
    setNewSupplierName("");
    setNewSupplierPhone("");
    toast.success("تمت إضافة المورد");
  }

  function handleDeleteSupplier(supplierId: string) {
    const used = purchases.some(p => p.supplierId === supplierId && p.status !== "Cancelled");
    if (used) { toast.error("لا يمكن الحذف: المورد مرتبط بفواتير نشطة"); return; }
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    if (!window.confirm(`حذف «${supplier.name}»؟`)) return;
    const res = deleteSupplier(supplierId);
    if (!res.success) toast.error(res.error || "تعذر الحذف");
    else toast.success("تم الحذف");
  }

  return (
    <div className="dashboard-page" dir="rtl">
      {/* Header */}
      <header className="dashboard-page-header">
        <div>
          <h1 className="dash-page-title">الإعدادات</h1>
          <p className="dash-caption mt-1">التوصيل · المخزون · الحساب</p>
        </div>
        {role && (
          <Badge className="dashboard-badge-success h-10 px-4 text-xs">
            {role === "admin" ? "مدير" : "موظف"}
          </Badge>
        )}
      </header>

      {isAdmin && (
        <>
          {/* Store Info */}
          <div className="dashboard-card max-w-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
              <div className="dashboard-kpi-icon-primary"><Store className="h-5 w-5" /></div>
              <div>
                <h2 className="dash-section-title">معلومات المتجر</h2>
                <p className="dash-caption">يظهر الهاتف والواتساب في الفواتير والصفحة الرئيسية</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="dashboard-label flex items-center gap-2">
                  <Phone className="h-4 w-4 text-accent" /> هاتف المتجر <span className="text-destructive">*</span>
                </label>
                <Input
                  type="tel" dir="ltr" className="saneen-input text-left font-sans"
                  placeholder="0555123456 أو +213 550 12 34 56"
                  value={storePhone}
                  onChange={e => setStorePhone(formatStorePhoneInput(e.target.value))}
                />
              </div>
              <div>
                <label className="dashboard-label flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#25D366]" /> واتساب المتجر <span className="text-destructive">*</span>
                </label>
                <Input
                  type="tel" dir="ltr" className="saneen-input text-left font-sans"
                  placeholder="0555123456 أو +213 550 12 34 56"
                  value={storeWhatsApp}
                  onChange={e => setStoreWhatsApp(formatStorePhoneInput(e.target.value))}
                />
              </div>
              <button
                type="button"
                className="dashboard-btn-accent w-full sm:w-auto"
                onClick={() => {
                  const phoneCheck = validateStorePhone(storePhone);
                  if (!phoneCheck.valid) { toast.error(phoneCheck.message); return; }
                  const waCheck = validateStorePhone(storeWhatsApp);
                  if (!waCheck.valid) { toast.error(waCheck.message); return; }
                  updateSettings({ companyPhone: storePhone.trim(), companyWhatsApp: storeWhatsApp.trim() });
                  toast.success("تم حفظ أرقام التواصل");
                }}
              >
                <Save className="h-4 w-4" /> حفظ أرقام التواصل
              </button>
            </div>
          </div>

          {/* Suppliers */}
          <div className="dashboard-section-block">
            <div className="dashboard-section-head">
              <div className="flex items-center gap-3">
                <div className="dashboard-kpi-icon-accent"><Truck className="h-5 w-5" /></div>
                <div>
                  <h2 className="dash-section-title">إدارة الموردين</h2>
                  <p className="dash-caption">{suppliers.length} مورد مسجّل</p>
                </div>
              </div>
            </div>
            <div className="dashboard-grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="sm:col-span-2">
                <label className="dashboard-label">اسم المورد <span className="text-destructive">*</span></label>
                <Input value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} className="saneen-input" placeholder="شركة التوريد" maxLength={80} />
              </div>
              <div>
                <label className="dashboard-label">الهاتف</label>
                <Input type="tel" inputMode="numeric" value={newSupplierPhone} onChange={e => setNewSupplierPhone(formatAlgerianPhoneInput(e.target.value))} className="saneen-input font-sans" placeholder="0555123456" maxLength={10} onKeyDown={blockNonNumericKeys} />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleAddSupplier} className="dashboard-btn-primary w-full">
                  <Plus className="h-4 w-4" /> إضافة
                </button>
              </div>
            </div>
            {suppliers.length === 0 ? (
              <div className="dashboard-empty py-8"><p className="dash-caption">لا موردين — أضف مورداً أعلاه</p></div>
            ) : (
              <div className="dashboard-table-wrap !shadow-none !p-0">
                <table className="dashboard-table">
                  <thead><tr><th>الاسم</th><th>الهاتف</th><th className="text-center w-16">حذف</th></tr></thead>
                  <tbody>
                    {suppliers.map(s => (
                      <tr key={s.id}>
                        <td className="font-bold">{s.name}</td>
                        <td className="font-sans text-muted-foreground">{s.phone || "—"}</td>
                        <td className="text-center">
                          <button type="button" onClick={() => handleDeleteSupplier(s.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10" title="حذف">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Wilayas */}
          <div className="dashboard-section-block p-0 overflow-hidden">
            <div className="p-6 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="dashboard-kpi-icon-primary"><MapPin className="h-5 w-5" /></div>
                <div className="flex-1">
                  <h2 className="dash-section-title">التوصيل — الولايات والشحن</h2>
                  <p className="dash-caption">{wilayaCount} / {WILAYA_COUNT} ولاية — تظهر للزبون عند الطلب</p>
                </div>
                {missingWilayas > 0 && (
                  <button type="button" className="dashboard-btn-primary shrink-0" onClick={() => {
                    const added = restoreMissingWilayas();
                    toast.success(added > 0 ? `تمت استعادة ${added} ولاية` : "تم التحديث — الولايات الـ 58 متوفرة");
                  }}>
                    <RotateCcw className="h-4 w-4" /> استعادة الـ {WILAYA_COUNT} ولاية
                  </button>
                )}
              </div>
            </div>
            <div className="dashboard-table-wrap dashboard-table-scroll !rounded-none !border-0 !shadow-none max-h-[min(480px,55vh)]">
              <table className="dashboard-table">
                <thead><tr><th>الولاية</th><th className="text-center">الشحن (دج)</th><th className="text-center w-20">حذف</th></tr></thead>
                <tbody>
                  {sortedWilayas.map(name => (
                    <tr key={name}>
                      <td>
                        <input className="dashboard-input !h-9 !bg-transparent w-full max-w-xs" defaultValue={name} onBlur={e => renameWilaya(name, e.target.value)} />
                      </td>
                      <td className="text-center">
                        <div className="inline-flex items-center gap-1 dashboard-card-flat px-3 py-1">
                          <input type="text" inputMode="numeric" className="w-16 bg-transparent outline-none text-center font-bold text-sm tabular-nums"
                            value={wilayaFees[name]} onKeyDown={blockNonNumericKeys}
                            onChange={e => {
                              const v = parseInt(formatPriceInput(e.target.value) || "0", 10);
                              const check = validateWilayaFee(v);
                              if (check.valid) updateWilayaFee(name, v);
                            }}
                          />
                          <span className="dash-caption">دج</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <button type="button" onClick={() => { if (window.confirm(`حذف ${name}؟`)) deleteWilaya(name); }} className="p-2 rounded-lg text-destructive/60 hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Communes */}
          <div className="dashboard-section-block p-0 overflow-hidden">
            <div className="p-6 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="dashboard-kpi-icon-accent"><Building2 className="h-5 w-5" /></div>
                <div>
                  <h2 className="dash-section-title">البلديات (قائمة الزبون)</h2>
                  <p className="dash-caption">اختر ولاية ثم أضف أو احذف البلديات</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="dashboard-label">الولاية</label>
                <select className="saneen-input w-full" value={selectedWilaya} onChange={e => setSelectedWilaya(e.target.value)}>
                  {sortedWilayas.map(w => <option key={w} value={w}>{w} ({(wilayaCommunes[w] || []).length} بلدية)</option>)}
                </select>
              </div>
              <div className="dashboard-grid sm:grid-cols-[1fr_auto] gap-4">
                <div>
                  <label className="dashboard-label">بلدية جديدة</label>
                  <Input value={newCommuneName} onChange={e => setNewCommuneName(e.target.value)} className="saneen-input" placeholder="مثال: باب الزوار" maxLength={80} />
                </div>
                <div className="flex items-end">
                  <button type="button" className="dashboard-btn-accent w-full sm:w-auto" onClick={() => {
                    const name = newCommuneName.trim();
                    if (!name) { toast.error("أدخل اسم البلدية"); return; }
                    if (!selectedWilaya) { toast.error("اختر ولاية"); return; }
                    const current = wilayaCommunes[selectedWilaya] || [];
                    if (current.includes(name)) { toast.error("البلدية موجودة مسبقاً"); return; }
                    setWilayaCommunesList(selectedWilaya, [...current, name]);
                    setNewCommuneName("");
                    toast.success("تمت إضافة البلدية");
                  }}>
                    <Plus className="h-4 w-4" /> إضافة
                  </button>
                </div>
              </div>
              {communesForSelected.length === 0 ? (
                <div className="dashboard-empty py-6"><p className="dash-caption">لا بلديات — أضف بلدية أو استعد القائمة الافتراضية</p></div>
              ) : (
                <div className="dashboard-table-wrap dashboard-table-scroll !shadow-none max-h-[min(360px,45vh)]">
                  <table className="dashboard-table">
                    <thead><tr><th>البلدية</th><th className="text-center w-20">حذف</th></tr></thead>
                    <tbody>
                      {communesForSelected.map(commune => (
                        <tr key={commune}>
                          <td className="font-bold">{commune}</td>
                          <td className="text-center">
                            <button type="button" className="p-2 rounded-lg text-destructive/60 hover:bg-destructive/10"
                              onClick={() => {
                                if (communesForSelected.length <= 1) { toast.error("يجب الإبقاء على بلدية واحدة على الأقل"); return; }
                                if (!window.confirm(`حذف «${commune}» من ${selectedWilaya}؟`)) return;
                                setWilayaCommunesList(selectedWilaya, communesForSelected.filter(c => c !== commune));
                                toast.success("تم الحذف");
                              }}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Add Wilaya + Reorder Level */}
          <div className="dashboard-grid-2">
            <div className="dashboard-card">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
                <div className="dashboard-kpi-icon-gold"><Plus className="h-5 w-5" /></div>
                <h2 className="dash-section-title">ولاية جديدة</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="dashboard-label">الاسم</label>
                  <Input placeholder="01 - أدرار" value={newWilayaName} onChange={e => setNewWilayaName(e.target.value)} className="saneen-input" />
                </div>
                <div>
                  <label className="dashboard-label">الشحن (دج)</label>
                  <Input type="text" inputMode="numeric" value={newWilayaFee} onKeyDown={blockNonNumericKeys} onChange={e => setNewWilayaFee(parseInt(formatPriceInput(e.target.value) || "0", 10))} className="saneen-input" />
                </div>
                <button type="button" className="dashboard-btn-accent w-full" onClick={() => {
                  if (!newWilayaName.trim()) { toast.error("أدخل اسم الولاية"); return; }
                  const feeCheck = validateWilayaFee(newWilayaFee);
                  if (!feeCheck.valid) { toast.error(feeCheck.message); return; }
                  addWilaya(newWilayaName.trim(), newWilayaFee);
                  setNewWilayaName("");
                  setNewWilayaFee(600);
                  toast.success("تمت الإضافة");
                }}>
                  <Save className="h-4 w-4" /> إضافة
                </button>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
                <div className="dashboard-kpi-icon-muted"><Package className="h-5 w-5" /></div>
                <h2 className="dash-section-title">تنبيه المخزون</h2>
              </div>
              <div className="space-y-4">
                <label className="dashboard-label">الحد الأدنى (قطع)</label>
                <div className="flex items-center gap-4">
                  <Input type="text" inputMode="numeric" value={globalReorderLevel} onKeyDown={blockNonNumericKeys}
                    onChange={e => {
                      const v = parseInt(formatPriceInput(e.target.value, 9999) || "0", 10);
                      const check = validateReorderLevel(v);
                      if (check.valid) setGlobalReorderLevel(v);
                    }}
                    className="saneen-input w-28 text-center text-lg font-bold"
                  />
                  <p className="dash-caption flex-1 leading-relaxed">تنبيه في الرئيسية عند الوصول لهذا الحد.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recovery Secret (admin only) */}
      {isAdmin && (
        <div className="dashboard-card max-w-xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
            <div className="dashboard-kpi-icon-accent"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <h2 className="dash-section-title">رمز استرداد كلمة المرور</h2>
              <p className="dash-caption mt-1">{recoveryConfigured ? "مُفعّلة — تُستخدم عند «نسيت كلمة المرور»" : "غير مُضبطة — إلزامية لحماية حسابك"}</p>
            </div>
          </div>
          {!recoveryConfigured && (
            <div className="mb-5 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm leading-relaxed space-y-1">
                <p className="font-black text-destructive">تحذير: بدون رمز الاسترداد لن تستطيع استعادة الحساب</p>
                <p className="text-muted-foreground">إذا نسيت كلمة المرور وليس لديك هذه الكلمة، لن يمكن الدخول على هذا المتصفح.</p>
              </div>
            </div>
          )}
          <p className="dashboard-label mb-2">{ADMIN_RECOVERY_QUESTION}</p>
          <p className="dash-caption mb-4 leading-relaxed">{ADMIN_RECOVERY_QUESTION_HINT}</p>
          <div className="space-y-4">
            <div>
              <label className="dashboard-label">رمزك (كلمة أو كلمتان)</label>
              <Input type="text" className="saneen-input" value={recoveryForm.answer} autoComplete="off" maxLength={RECOVERY_ANSWER_MAX_LENGTH}
                onChange={e => setRecoveryForm(f => ({ ...f, answer: e.target.value.slice(0, RECOVERY_ANSWER_MAX_LENGTH) }))}
                placeholder="مثال: وميض"
              />
            </div>
            <div>
              <label className="dashboard-label">تأكيد الإجابة</label>
              <Input type="text" className="saneen-input" value={recoveryForm.confirmAnswer} autoComplete="off" maxLength={RECOVERY_ANSWER_MAX_LENGTH}
                onChange={e => setRecoveryForm(f => ({ ...f, confirmAnswer: e.target.value.slice(0, RECOVERY_ANSWER_MAX_LENGTH) }))}
                placeholder="أعد كتابة الرمز"
              />
            </div>
            <div>
              <label className="dashboard-label">كلمة المرور الحالية (للتأكيد)</label>
              <Input type="password" className="saneen-input" value={recoveryForm.currentPassword} maxLength={64}
                onChange={e => setRecoveryForm(f => ({ ...f, currentPassword: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <button type="button" disabled={isSavingRecovery} className="dashboard-btn-accent w-full"
              onClick={() => {
                if (!recoveryForm.answer.trim()) { toast.error("أدخل رمز الاسترداد"); return; }
                if (recoveryForm.answer.trim().length < RECOVERY_ANSWER_MIN_LENGTH) { toast.error("الرمز قصير جداً"); return; }
                if (recoveryForm.answer !== recoveryForm.confirmAnswer) { toast.error("تأكيد الإجابة غير متطابق"); return; }
                if (!recoveryForm.currentPassword) { toast.error("أدخل كلمة المرور الحالية للتأكيد"); return; }
                setIsSavingRecovery(true);
                void (async () => {
                  try {
                    await setAdminRecoverySecret(recoveryForm.answer, recoveryForm.currentPassword);
                    sessionStorage.removeItem("saneen_recovery_warn_toast");
                    toast.success("تم حفظ رمز الاسترداد بنجاح");
                    setRecoverySaved(true);
                    setRecoveryForm({ answer: "", confirmAnswer: "", currentPassword: "" });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "فشل الحفظ");
                  } finally {
                    setIsSavingRecovery(false);
                  }
                })();
              }}
            >
              {isSavingRecovery ? "جاري الحفظ..." : "حفظ رمز الاسترداد"}
            </button>
          </div>
        </div>
      )}

      {/* Password Change (all roles) */}
      <div className="dashboard-card max-w-xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
          <div className="dashboard-kpi-icon-primary"><Lock className="h-5 w-5" /></div>
          <h2 className="dash-section-title">كلمة المرور</h2>
        </div>
        <p className="dash-caption mb-4 leading-relaxed">{PASSWORD_REQUIREMENTS_HINT}</p>
        <div className="space-y-4">
          <div>
            <label className="dashboard-label">الحالية</label>
            <Input type="password" placeholder="••••••••" className="saneen-input" value={passwords.old} onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))} />
            {passwordErrors.old && <p className="text-xs text-destructive mt-1">{passwordErrors.old}</p>}
          </div>
          <div>
            <label className="dashboard-label">الجديدة</label>
            <Input type="password" placeholder="••••••••" className="saneen-input" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} />
            {passwordErrors.new && <p className="text-xs text-destructive mt-1">{passwordErrors.new}</p>}
          </div>
          <div>
            <label className="dashboard-label">تأكيد</label>
            <Input type="password" placeholder="••••••••" className="saneen-input" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
            {passwordErrors.confirm && <p className="text-xs text-destructive mt-1">{passwordErrors.confirm}</p>}
          </div>
          <button type="button" className="dashboard-btn-accent w-full"
            onClick={() => {
              const errs = validatePasswordChange(passwords.old, passwords.new, passwords.confirm);
              if (Object.keys(errs).length > 0) {
                setPasswordErrors(errs);
                toast.error(Object.values(errs)[0] as string);
                return;
              }
              setPasswordErrors({});
              void (async () => {
                try {
                  await updatePassword(passwords.old, passwords.new);
                  toast.success("تم تحديث كلمة المرور");
                  setPasswords({ old: "", new: "", confirm: "" });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "كلمة المرور القديمة غير صحيحة");
                }
              })();
            }}
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
