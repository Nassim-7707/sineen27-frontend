import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Layers,
  Settings,
  LogOut,
  ArrowLeft,
  ScanLine,
  Truck,
  Users as UsersIcon,
} from "lucide-react";
import { useAuth } from "@/adminFunctions/auth";
import { useStoreSettings } from "@/adminFunctions/storeSettings";

const NAV_LINKS = [
  { to: "/dashboard#overview", hash: "#overview", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/dashboard#pos", hash: "#pos", label: "نقطة البيع", icon: ScanLine },
  { to: "/dashboard#catalog", hash: "#catalog", label: "المنتجات", icon: Package },
  { to: "/dashboard#orders", hash: "#orders", label: "الطلبات", icon: ShoppingCart },
  { to: "/dashboard#purchases", hash: "#purchases", label: "المشتريات", icon: Truck },
  { to: "/dashboard#filters", hash: "#filters", label: "الفلاتر", icon: Layers },
  { to: "/dashboard#settings", hash: "#settings", label: "الإعدادات", icon: Settings },
  { to: "/dashboard#users", hash: "#users", label: "المستخدمون", icon: UsersIcon },
];

export default function AdminNavbar() {
  const { hash } = useLocation();
  const { role, logout } = useAuth();
  const { settings } = useStoreSettings();

  const links = NAV_LINKS.filter(
    (link) => !(role === "employee" && link.hash === "#users")
  );

  const isActive = (linkHash: string) =>
    hash === linkHash || (hash === "" && linkHash === "#overview");

  return (
    <>
      <nav className="dashboard-topnav" aria-label="التنقل الرئيسي">
        <div className="dashboard-topnav-inner">
          <Link to="/dashboard#overview" className="dashboard-topnav-brand">
            <div className="dashboard-nav-brand-icon">
              <LayoutDashboard className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="font-heading text-sm font-bold text-foreground leading-tight truncate max-w-[140px]">
                {settings.companyName}
              </p>
              <p className="dash-caption truncate">لوحة التحكم</p>
            </div>
          </Link>

          {/* على الهاتف نستخدم شريط التنقل السفلي فقط لتفادي التكرار */}
          <div className="dashboard-topnav-links hidden lg:flex">
            <ul>
              {links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.hash);
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className={active ? "dashboard-topnav-link dashboard-topnav-link-active" : "dashboard-topnav-link"}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="dashboard-topnav-actions">
            <span className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              متصل
            </span>
            <Link to="/" className="dashboard-btn-ghost dashboard-btn-sm hidden sm:inline-flex">
              <ArrowLeft className="h-4 w-4" />
              المتجر
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = "/dashboard";
              }}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              title="خروج"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      <nav className="dashboard-mobile-nav lg:hidden" aria-label="تنقل سريع">
        <div className="flex justify-around items-center h-[68px] px-1 overflow-x-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.hash);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={
                  active
                    ? "dashboard-mobile-nav-link dashboard-mobile-nav-link-active"
                    : "dashboard-mobile-nav-link"
                }
              >
                <div className="dashboard-mobile-nav-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold whitespace-nowrap">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
