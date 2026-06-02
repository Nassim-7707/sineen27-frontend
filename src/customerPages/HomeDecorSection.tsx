import { useCallback, useEffect, useState } from "react";
import { useStoreSettings } from "@/adminFunctions/storeSettings";
import { toTelHref, toWhatsAppHref } from "@/customerFunctions/contactLinks";
import { Phone } from "lucide-react";

const ROTATE_MS = 5500;
const FADE_MS = 500;

const TESTIMONIALS = [
  {
    text: "طلبت عباءة مقاس 56، الخياطة مرتبة والقماش مريح للصلاة.",
    author: "يوسف ب.",
    wilaya: "الجزائر",
  },
  {
    text: "التوصيل وصل في الموعد والمقاس مطابق لما اخترته في الموقع.",
    author: "أمين ك.",
    wilaya: "وهران",
  },
  {
    text: "جدول المقاسات واضح، سهّل عليّ الاختيار قبل إتمام الطلب.",
    author: "كريم م.",
    wilaya: "مستغانم",
  },
  {
    text: "تواصل سريع عند تأكيد الطلب، تجربة مريحة من البداية للنهاية.",
    author: "رشيد ع.",
    wilaya: "قسنطينة",
  },
  {
    text: "القماش خفيف ولا يسبب حرارة زائدة، مناسب للصلاة اليومية.",
    author: "بلال ح.",
    wilaya: "سطيف",
  },
  {
    text: "طلبت لأول مرة وكررت لأن الجودة ثابتة بين الطلبات.",
    author: "سامي ل.",
    wilaya: "باتنة",
  },
  {
    text: "التغليف نظيف والقطعة وصلت بدون أي عيب في الخياطة.",
    author: "فارس ن.",
    wilaya: "بجاية",
  },
  {
    text: "الموقع سهل الاستخدام حتى من الهاتف، الطلب لم يأخذ وقتاً طويلاً.",
    author: "عادل ر.",
    wilaya: "تلمسان",
  },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TestimonialSlide({
  text,
  author,
  wilaya,
  visible,
}: (typeof TESTIMONIALS)[0] & { visible: boolean }) {
  return (
    <blockquote
      className={`absolute inset-0 flex flex-col justify-center text-right rounded-3xl bg-charcoal/40 backdrop-blur-md border border-white/10 px-6 py-8 sm:px-10 sm:py-10 transition-all ease-in-out shadow-2xl ${
        visible ? "opacity-100 z-10 translate-y-0" : "opacity-0 z-0 pointer-events-none translate-y-4"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden={!visible}
    >
      <div className="text-gold mb-4 opacity-80">
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
      </div>
      <p className="text-white text-base sm:text-xl leading-[1.85] font-medium drop-shadow-sm">{text}</p>
      <footer className="mt-6 pt-5 border-t border-white/10 text-sm not-italic flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-lg border border-gold/30">
          {author.charAt(0)}
        </div>
        <div>
          <cite className="font-bold text-white not-italic drop-shadow-sm block">{author}</cite>
          <span className="text-white/60 text-xs">{wilaya}</span>
        </div>
      </footer>
    </blockquote>
  );
}

function TestimonialRotator() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(next, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, next]);

  const current = TESTIMONIALS[index];

  return (
    <div
      className="mb-10 sm:mb-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative mx-auto max-w-2xl min-h-[260px] sm:min-h-[240px]"
        aria-live="polite"
        aria-atomic="true"
      >
        {TESTIMONIALS.map((item, i) => (
          <TestimonialSlide key={`${item.author}-${i}`} {...item} visible={i === index} />
        ))}
      </div>

      <p className="sr-only">
        {current.author}، {current.wilaya}: {current.text}
      </p>

      <div className="flex justify-center gap-2 mt-8 relative z-10" role="tablist" aria-label="التعليقات">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`تعليق ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`rounded-full transition-all duration-300 ${
              i === index ? "h-2 w-8 bg-gold shadow-[0_0_8px_rgba(201,163,85,0.6)]" : "h-2 w-2 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomeDecorSection() {
  const { settings } = useStoreSettings();

  const phoneHref = toTelHref(settings.companyPhone);
  const whatsappHref = toWhatsAppHref(settings.companyWhatsApp);
  const hasPhone = Boolean(settings.companyPhone?.trim());
  const hasWhatsApp = Boolean(settings.companyWhatsApp?.trim());

  return (
    <section
      id="home-essence"
      className="relative py-16 sm:py-24 overflow-hidden"
      aria-labelledby="home-essence-title"
    >
      <div className="absolute inset-0 z-0">
        <img 
          src="/testimonials-bg.png" 
          alt="" 
          className="w-full h-full object-cover opacity-80" 
        />
        <div className="absolute inset-0 bg-charcoal/80" />
      </div>

      <div className="container px-4 max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <span className="text-gold font-bold text-sm mb-3 block tracking-wider uppercase">ماذا يقولون عنا</span>
          <h2
            id="home-essence-title"
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
          >
            آراء الزبائن
          </h2>
          <div className="w-16 h-1 bg-gold mx-auto rounded-full opacity-80" />
        </div>

        <TestimonialRotator />

        <div className="mt-4 flex flex-col sm:flex-row justify-center gap-4 border-t border-white/10 pt-10 px-4 sm:px-0">
          {hasPhone && (
            <a
              href={phoneHref}
              className="w-full sm:w-auto px-8 inline-flex items-center justify-center gap-3 rounded-2xl bg-gold/90 py-4 text-sm font-bold text-charcoal hover:bg-gold transition-colors shadow-lg shadow-gold/20 hover:-translate-y-1"
            >
              <Phone className="h-5 w-5 shrink-0" />
              <span>اتصل بنا</span>
              <span dir="ltr" className="font-sans font-medium">
                {settings.companyPhone}
              </span>
            </a>
          )}
          {hasWhatsApp && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 inline-flex items-center justify-center gap-3 rounded-2xl bg-[#25D366] py-4 text-sm font-bold text-white hover:bg-[#20bd5a] transition-colors shadow-lg shadow-[#25D366]/20 hover:-translate-y-1"
            >
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              <span>واتساب</span>
              <span dir="ltr" className="font-sans font-medium">
                {settings.companyWhatsApp}
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
