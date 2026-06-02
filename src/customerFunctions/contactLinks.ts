/** أرقام للاتصال وواتساب — من إعدادات المتجر */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** رقم دولي لـ wa.me (الجزائر: 213…) */
export function toWhatsAppDigits(phone: string): string {
  let d = digitsOnly(phone);
  if (!d) return "";
  if (d.startsWith("0") && d.length >= 9) {
    d = "213" + d.slice(1);
  }
  return d;
}

export function toTelHref(phone: string): string {
  const d = digitsOnly(phone);
  if (!d) return "#";
  if (phone.trim().startsWith("+")) {
    return `tel:${phone.replace(/\s/g, "")}`;
  }
  if (d.startsWith("0")) {
    return `tel:+213${d.slice(1)}`;
  }
  return `tel:+${d}`;
}

export function toWhatsAppHref(phone: string): string {
  const d = toWhatsAppDigits(phone);
  return d ? `https://wa.me/${d}` : "#";
}
