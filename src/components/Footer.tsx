import { Link } from "react-router-dom";
import { useStoreSettings } from "@/adminFunctions/storeSettings";

export default function Footer() {
  const { settings } = useStoreSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="container py-10 sm:py-12 px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-center sm:text-right">
        <div>
          <h3 className="font-heading text-xl font-bold mb-4">{settings.companyName}</h3>
          <p className="text-sm opacity-80 leading-relaxed">
            {settings.companyTagline
              ? `${settings.companyTagline} — `
              : ""}
            عباءات رجالية للصلاة بأقمشة مريحة وتصاميم عملية.
          </p>
        </div>
        <div>
          <h4 className="font-heading text-lg font-bold mb-4">روابط سريعة</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li><Link to="/products" className="hover:opacity-100 transition-opacity">المنتجات</Link></li>
            <li><Link to="/offers" className="hover:opacity-100 transition-opacity">العروض</Link></li>
            <li><Link to="/about" className="hover:opacity-100 transition-opacity">عن المتجر</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-lg font-bold mb-4">تواصل معنا</h4>
          <ul className="space-y-2 text-sm opacity-80">
            {settings.companyPhone && <li>الهاتف: {settings.companyPhone}</li>}
            {settings.companyAddress && <li>العنوان: {settings.companyAddress}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/20 py-4 px-4">
        <p className="text-center text-sm opacity-60">
          © {year} {settings.companyName}. جميع الحقوق محفوظة
        </p>
      </div>
    </footer>
  );
}
