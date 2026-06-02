import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Star, Truck, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/adminFunctions/storeSettings";
import HomeDecorSection from "./HomeDecorSection";
import heroBanner from "@/assets/hero-banner.jpg";
import { motion } from "framer-motion";

const features = [
  { icon: Star, title: "جودة مضمونة", desc: "أقمشة مختارة ومتانة في الخياطة" },
  { icon: Truck, title: "توصيل سريع", desc: "شحن لجميع ولايات الوطن" },
  { icon: Shield, title: "دفع عند الاستلام", desc: "ادفع عند استلام طلبك" },
  { icon: Sparkles, title: "تشكيلة متنوعة", desc: "موديلات وألوان تناسب مختلف الأذواق" },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function Index() {
  const { settings } = useStoreSettings();
  const [imageLoaded, setImageLoaded] = useState(false);

  const scrollToEssence = () => {
    document.getElementById("home-essence")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[100svh] md:h-[90vh] min-h-[550px] flex items-end md:items-center overflow-hidden pb-12 md:pb-0">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-charcoal animate-pulse" />
        )}
        <motion.img
          src={heroBanner}
          alt="عباءات الصلاة"
          className="absolute inset-0 w-full h-full object-cover object-top md:object-center"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: imageLoaded ? 1 : 1.1, opacity: imageLoaded ? 1 : 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent md:bg-none md:hero-overlay" />

        <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMEwyNSAxMEwyMCAyMEwxNSAxMFoiIGZpbGw9IndoaXRlIi8+PC9zdmc+')]" />

        <div className="container relative z-10 text-primary-foreground px-4">
          <motion.div
            className="max-w-2xl space-y-5 md:space-y-8 text-center md:text-right"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="inline-block gold-gradient px-4 py-1.5 rounded-full text-xs md:text-sm font-medium text-accent-foreground"
            >
              ✨ تشكيلة جديدة {CURRENT_YEAR}
            </motion.div>
            <h1 className="font-heading text-4xl md:text-7xl font-bold leading-snug md:leading-relaxed">
              أناقة الصلاة
              <br />
              <span className="text-gold">تبدأ من هنا</span>
            </h1>
            <p className="text-sm md:text-xl opacity-90 max-w-lg leading-relaxed mx-auto md:mx-0">
              عباءات رجالية للصلاة — مريحة ومناسبة للاستخدام اليومي
            </p>
            <motion.div
              className="flex flex-col sm:flex-row items-center md:items-start gap-3 md:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button asChild size="lg" className="gold-gradient border-0 text-foreground font-bold text-base px-10 w-full sm:w-auto">
                <Link to="/products">تسوق الآن</Link>
              </Button>
              <Button
                type="button"
                size="lg"
                className="bg-charcoal text-primary-foreground border-0 hover:bg-foreground px-8 w-full sm:w-auto cursor-pointer font-bold"
                onClick={scrollToEssence}
              >
                آراء وتواصل
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 md:py-20 bg-secondary">
        <div className="container px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-center text-center gap-4"
              >
                <div className="h-16 w-16 rounded-2xl gold-gradient flex items-center justify-center shrink-0">
                  <f.icon className="h-7 w-7 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <HomeDecorSection />
    </div>
  );
}
