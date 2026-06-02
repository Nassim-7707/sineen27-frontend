export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

function collectErrors<K extends string>(
  checks: Array<[K, ValidationResult]>,
): FieldErrors<K> {
  return Object.fromEntries(
    checks.filter(([, r]) => !r.valid).map(([k, r]) => [k, r.message!]),
  ) as FieldErrors<K>;
}

const PHONE_REGEX = /^0(5|6|7)\d{8}$/;
const NAME_REGEX = /^[\u0600-\u06FFa-zA-Z\s.'-]{3,60}$/;

export function validateFullName(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: "الاسم الكامل مطلوب" };
  if (trimmed.length < 3) return { valid: false, message: "الاسم يجب أن يكون 3 أحرف على الأقل" };
  if (trimmed.length > 60) return { valid: false, message: "الاسم طويل جداً (60 حرف كحد أقصى)" };
  if (!NAME_REGEX.test(trimmed)) return { valid: false, message: "الاسم يجب أن يحتوي على حروف فقط" };
  return { valid: true };
}

export function validatePhone(value: string): ValidationResult {
  const digits = value.replace(/\D/g, "");
  if (!digits) return { valid: false, message: "رقم الهاتف مطلوب" };
  if (digits.length !== 10) return { valid: false, message: "رقم الهاتف يجب أن يكون 10 أرقام (مثال: 0555123456)" };
  if (!PHONE_REGEX.test(digits)) return { valid: false, message: "رقم غير صالح — يجب أن يبدأ بـ 05 أو 06 أو 07" };
  return { valid: true };
}

/** هاتف المتجر على الفواتير — يقبل 05… أو +213… */
export function validateStorePhone(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: "رقم هاتف المتجر مطلوب" };
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    return { valid: false, message: "أدخل رقماً صالحاً (مثال: 0555123456 أو +213 550 12 34 56)" };
  }
  return { valid: true };
}

export function formatStorePhoneInput(raw: string): string {
  return raw.replace(/[^\d+\s-]/g, "").slice(0, 24);
}

export function validateWilaya(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, message: "يرجى اختيار الولاية" };
  return { valid: true };
}

export function validateCommune(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, message: "يرجى اختيار البلدية" };
  return { valid: true };
}

export function validateUsername(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: "اسم المستخدم مطلوب" };
  if (trimmed.length < 3) return { valid: false, message: "اسم المستخدم: 3 أحرف على الأقل" };
  if (trimmed.length > 30) return { valid: false, message: "اسم المستخدم: 30 حرف كحد أقصى" };
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) return { valid: false, message: "أحرف إنجليزية وأرقام و _ . - فقط" };
  return { valid: true };
}

/** متطلبات كلمة المرور (دخول، إنشاء مستخدم، تغيير كلمة المرور) */
export const PASSWORD_REQUIREMENTS_HINT =
  "6 أحرف على الأقل، حرف كبير، رقم، ورمز خاص (!@#$…)";

export function validatePasswordStrength(value: string): ValidationResult {
  if (!value) return { valid: false, message: "كلمة المرور مطلوبة" };
  if (value.length < 6) {
    return { valid: false, message: "كلمة المرور: 6 أحرف على الأقل" };
  }
  if (value.length > 64) return { valid: false, message: "كلمة المرور طويلة جداً" };
  if (!/[A-Z]/.test(value)) {
    return { valid: false, message: "أضف حرفاً كبيراً واحداً على الأقل (A-Z)" };
  }
  if (!/[0-9]/.test(value)) {
    return { valid: false, message: "أضف رقماً واحداً على الأقل (0-9)" };
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return { valid: false, message: "أضف رمزاً خاصاً واحداً على الأقل (!@#$…)" };
  }
  return { valid: true };
}

export function validatePassword(value: string): ValidationResult {
  return validatePasswordStrength(value);
}

/** عند تسجيل الدخول فقط — لا نفرض قوة كلمة المرور المخزّنة */
export function validateLoginPassword(value: string): ValidationResult {
  if (!value) return { valid: false, message: "كلمة المرور مطلوبة" };
  if (value.length > 64) return { valid: false, message: "كلمة المرور طويلة جداً" };
  return { valid: true };
}

/** تاريخ اليوم بصيغة YYYY-MM-DD لحقول type="date" */
export function getTodayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** لا يُسمح بتاريخ فاتورة بعد اليوم */
export function validateInvoiceDate(value: string): ValidationResult {
  const raw = value?.trim();
  if (!raw) return { valid: false, message: "تاريخ الفاتورة مطلوب" };
  const day = raw.includes("T") ? raw.split("T")[0] : raw;
  if (day > getTodayDateInputValue()) {
    return { valid: false, message: "لا يمكن اختيار تاريخ بعد اليوم" };
  }
  return { valid: true };
}

export function clampDateToToday(value: string): string {
  if (!value?.trim()) return getTodayDateInputValue();
  const day = value.includes("T") ? value.split("T")[0] : value.trim();
  const today = getTodayDateInputValue();
  return day > today ? today : day;
}

export function validateProductName(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: "اسم المنتج مطلوب" };
  if (trimmed.length < 2) return { valid: false, message: "اسم المنتج: حرفان على الأقل" };
  if (trimmed.length > 120) return { valid: false, message: "اسم المنتج طويل جداً" };
  return { valid: true };
}

export function validateDiscountPercent(value: number): ValidationResult {
  if (Number.isNaN(value)) return { valid: false, message: "نسبة الخصم غير صالحة" };
  if (value < 0 || value > 100) return { valid: false, message: "الخصم بين 0% و 100%" };
  return { valid: true };
}

export function validateDescription(value: string): ValidationResult {
  if (value.length > 500) return { valid: false, message: "الوصف: 500 حرف كحد أقصى" };
  return { valid: true };
}

export interface CheckoutFormData {
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
}

export type CheckoutField = keyof CheckoutFormData;

export function validateCheckoutForm(data: CheckoutFormData): FieldErrors<CheckoutField> {
  const errors: FieldErrors<CheckoutField> = {};
  const checks: [CheckoutField, ValidationResult][] = [
    ["name", validateFullName(data.name)],
    ["phone", validatePhone(data.phone)],
    ["wilaya", validateWilaya(data.wilaya)],
    ["commune", validateCommune(data.commune)],
  ];
  for (const [field, result] of checks) {
    if (!result.valid && result.message) errors[field] = result.message;
  }
  return errors;
}

export function validateCheckoutField(
  field: CheckoutField,
  data: CheckoutFormData
): string | undefined {
  const map: Record<CheckoutField, () => ValidationResult> = {
    name: () => validateFullName(data.name),
    phone: () => validatePhone(data.phone),
    wilaya: () => validateWilaya(data.wilaya),
    commune: () => validateCommune(data.commune),
  };
  const result = map[field]();
  return result.valid ? undefined : result.message;
}

export function validateLoginForm(username: string, password: string): FieldErrors<"username" | "password"> {
  return collectErrors([
    ["username", validateUsername(username)],
    ["password", validateLoginPassword(password)],
  ]);
}

export function validateOrderCustomer(data: {
  customerName?: string;
  customerPhone?: string;
  customerWilaya?: string;
  customerAddress?: string;
}): FieldErrors<"customerName" | "customerPhone" | "customerWilaya" | "customerAddress"> {
  const errors: FieldErrors<"customerName" | "customerPhone" | "customerWilaya" | "customerAddress"> = {};
  const name = validateFullName(data.customerName || "");
  const phone = validatePhone(data.customerPhone || "");
  const wilaya = validateWilaya(data.customerWilaya || "");
  const commune = validateCommune(data.customerAddress || "");
  if (!name.valid) errors.customerName = name.message;
  if (!phone.valid) errors.customerPhone = phone.message;
  if (!wilaya.valid) errors.customerWilaya = wilaya.message;
  if (!commune.valid) errors.customerAddress = commune.message;
  return errors;
}

export function validateProductForm(data: {
  name?: string;
  discountPercent?: number;
  description?: string;
  category?: string;
  colors?: string[];
}): FieldErrors<"name" | "discountPercent" | "description" | "category" | "colors"> {
  const colorList = (data.colors || []).map((c) => c.trim()).filter(Boolean);
  type ProductField = "name" | "discountPercent" | "description" | "category" | "colors";
  const errors: FieldErrors<ProductField> = collectErrors([
    ["name", validateProductName(data.name || "")],
    ["discountPercent", validateDiscountPercent(data.discountPercent ?? 0)],
    ["description", validateDescription(data.description || "")],
  ]);
  if (!data.category?.trim()) errors.category = "يرجى اختيار الفئة";
  if (colorList.length === 0) {
    errors.colors = "أضف لوناً واحداً على الأقل لربط المخزون بالمشتريات والمتجر";
  }
  return errors;
}

/** تنسيق رقم الهاتف الجزائري أثناء الكتابة — أرقام فقط */
export function formatAlgerianPhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

/** اسم شخص — حروف ومسافات فقط */
export function formatFullNameInput(raw: string): string {
  return raw.replace(/[^\u0600-\u06FFa-zA-Z\s.'-]/g, "").slice(0, 60);
}

/** اسم مستخدم — إنجليزي وأرقام */
export function formatUsernameInput(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 30);
}

/** نسبة مئوية 0–100 */
export function formatPercentInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const n = Math.min(100, parseInt(digits, 10));
  return String(n);
}

/** عدد صحيح موجب */
export function formatPositiveIntInput(raw: string, max = 999999): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const n = Math.min(max, parseInt(digits, 10));
  return String(n);
}

/** سعر بالدينار — أرقام فقط */
export function formatPriceInput(raw: string, max = 99999999): string {
  return formatPositiveIntInput(raw, max);
}

/** تحويل نص حقل رقمي إلى عدد (بديل parseNum المكرر) */
export function parsePositiveInt(val: string): number {
  if (!val) return 0;
  const n = parseInt(val.replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

export function validateImageFile(file: File): ValidationResult {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { valid: false, message: "الصيغ المسموحة: JPG, PNG, WEBP, GIF" };
  }
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, message: "حجم الصورة يجب ألا يتجاوز 5 ميغابايت" };
  }
  return { valid: true };
}

export function validateColorName(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: "أدخل اسم اللون" };
  if (trimmed.length < 2) return { valid: false, message: "اسم اللون: حرفان على الأقل" };
  if (trimmed.length > 30) return { valid: false, message: "اسم اللون طويل جداً" };
  return { valid: true };
}

export function validateFilterLabel(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: "أدخل قيمة صالحة" };
  if (trimmed.length < 1) return { valid: false, message: "القيمة قصيرة جداً" };
  if (trimmed.length > 40) return { valid: false, message: "40 حرف كحد أقصى" };
  return { valid: true };
}

export function validateSupplierName(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: "اسم المورد مطلوب" };
  if (trimmed.length < 2) return { valid: false, message: "اسم المورد: حرفان على الأقل" };
  if (trimmed.length > 80) return { valid: false, message: "اسم المورد طويل جداً" };
  return { valid: true };
}

export function validateWilayaFee(value: number): ValidationResult {
  if (Number.isNaN(value) || value < 0) {
    return { valid: false, message: "سعر التوصيل يجب أن يكون رقماً موجباً" };
  }
  if (value > 50000) return { valid: false, message: "سعر التوصيل مرتفع جداً" };
  return { valid: true };
}

export function validateReorderLevel(value: number): ValidationResult {
  if (Number.isNaN(value) || value < 0) {
    return { valid: false, message: "الكمية يجب أن تكون رقماً موجباً" };
  }
  if (value > 9999) return { valid: false, message: "قيمة كبيرة جداً" };
  return { valid: true };
}

export function validatePasswordChange(
  oldP: string,
  newP: string,
  confirm: string
): FieldErrors<"old" | "new" | "confirm"> {
  const errors: FieldErrors<"old" | "new" | "confirm"> = {};
  if (!oldP) errors.old = "أدخل كلمة المرور الحالية";
  const np = validatePassword(newP);
  if (!np.valid) errors.new = np.message;
  if (!confirm) errors.confirm = "أكد كلمة المرور الجديدة";
  else if (newP !== confirm) errors.confirm = "كلمة المرور غير متطابقة";
  return errors;
}

/** منع إدخال الحروف في حقول الأرقام عبر لوحة المفاتيح */
export function blockNonNumericKeys(e: React.KeyboardEvent<HTMLInputElement>) {
  const allowed = [
    "Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
  ];
  if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
}
