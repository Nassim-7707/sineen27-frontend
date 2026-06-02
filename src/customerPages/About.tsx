import { Star, Heart, Award, Users, ShieldCheck, Gem } from "lucide-react";
import { motion } from "framer-motion";
import { useStoreSettings } from "@/adminFunctions/storeSettings";

const values = [
  { icon: Star, title: "الجودة أولاً", desc: "نختار أقمشة جيدة ونتعامل مع موردين موثوقين لضمان منتج يدوم." },
  { icon: Heart, title: "راحة العبادة", desc: "نصمم عباءاتنا لتوفر أقصى درجات الراحة أثناء الصلاة والعبادة." },
  { icon: Award, title: "تشكيلة متنوعة", desc: "موديلات وألوان تناسب الاستخدام اليومي." },
];

const numbers = [
  { value: "+5000", label: "عميل سعيد", icon: Users },
  { value: "+200", label: "موديل متوفر", icon: Gem },
  { value: "100%", label: "ضمان الجودة", icon: ShieldCheck },
];

export default function About() {
  const { settings } = useStoreSettings();
  return (
    <div className="container page-section px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto text-center mb-14"
      >
        <span className="text-accent font-medium text-sm mb-2 block">من نحن</span>
        <h1 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-4">عن {settings.companyName}</h1>
        <p className="text-muted-foreground leading-relaxed text-lg">
          متجر متخصص في العباءات الرجالية للصلاة. نحرص على أقمشة مريحة وتصاميم عملية
          تناسب الاستخدام اليومي والمناسبات.
        </p>
      </motion.div>

      {/* Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 mb-12 sm:mb-16 max-w-2xl mx-auto">
        {numbers.map((n, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="text-center p-6"
          >
            <n.icon className="h-8 w-8 mx-auto text-accent mb-2" />
            <p className="text-3xl font-bold text-foreground">{n.value}</p>
            <p className="text-sm text-muted-foreground">{n.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {values.map((v, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="bg-card rounded-xl border border-border p-8 text-center group hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
          >
            <div className="h-16 w-16 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <v.icon className="h-7 w-7 text-accent-foreground" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">{v.title}</h3>
            <p className="text-muted-foreground">{v.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-primary rounded-2xl p-6 sm:p-10 md:p-12 text-center text-primary-foreground"
      >
        <h2 className="font-heading text-3xl font-bold mb-4">التزامنا تجاهكم</h2>
        <p className="max-w-2xl mx-auto opacity-90 leading-relaxed text-lg">
          نسعى لتقديم منتجات جيدة بأسعار مناسبة، مع توصيل لجميع ولايات الوطن
          وخدمة ما بعد البيع عند الحاجة.
        </p>
      </motion.div>
    </div>
  );
}
