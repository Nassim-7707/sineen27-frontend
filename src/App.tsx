import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProviders } from "@/providers";
import Navbar from "@/components/Navbar";
import ScrollToTop from "@/components/ScrollToTop";
import Footer from "@/components/Footer";
import Home from "@/customerPages/Home";
import Products from "@/customerPages/Products";
import ProductDetails from "@/customerPages/ProductDetails";
import Cart from "@/customerPages/Cart";
import Checkout from "@/customerPages/Checkout";
import About from "@/customerPages/About";
import Offers from "@/customerPages/Offers";
import Dashboard from "@/adminPages/Dashboard";
import NotFound from "@/customerPages/NotFound";

function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/dashboard");

  return (
    <>
      <ScrollToTop />
      {!isAdminPage && <Navbar />}
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/about" element={<About />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminPage && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppProviders>
  );
}
