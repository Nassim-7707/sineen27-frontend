import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/customerFunctions/cart";
import { useStoreSettings } from "@/adminFunctions/storeSettings";
import { Badge } from "@/components/ui/badge";

const navLinks = [
  { to: "/", label: "الرئيسية" },
  { to: "/products", label: "المنتجات" },
  { to: "/offers", label: "العروض" },
  { to: "/about", label: "عن المتجر" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { totalItems } = useCart();
  const { settings } = useStoreSettings();

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container flex items-center justify-between h-14 sm:h-16 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <img src="/saneen-icon.svg" alt={settings.companyName} className="h-9 w-9" />
          <span className="font-heading text-2xl sm:text-4xl font-bold text-accent drop-shadow-md tracking-wider">
            {settings.companyName}
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`relative text-sm font-medium transition-colors hover:text-accent ${
                  location.pathname === l.to ? "text-accent" : "text-foreground"
                }`}
              >
                {l.label}
                {location.pathname === l.to && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            className="relative p-2 hover:text-accent transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <div className="absolute -top-1 -right-1">
                <Badge className="h-5 w-5 flex items-center justify-center p-0 text-xs gold-gradient text-accent-foreground border-0">
                  {totalItems}
                </Badge>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="md:hidden touch-target p-2 -mr-1"
            onClick={() => setOpen(!open)}
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-card overflow-hidden">
          <ul className="flex flex-col items-center gap-1 py-2">
            {navLinks.map((l) => (
              <li key={l.to} className="w-full">
                <Link
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`block w-full text-center py-3 px-6 text-sm font-medium touch-target ${
                    location.pathname === l.to
                      ? "text-accent"
                      : "text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
