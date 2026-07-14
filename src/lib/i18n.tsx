"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "ar" | "en";
export type Theme = "light" | "dark";

type Dict = Record<string, string>;

const ar: Dict = {
  "brand.name": "سهلة درج",
  "brand.tagline": "سوق السيارات الموثوق",
  "nav.c2c": "بين الأفراد",
  "nav.dealers": "المعارض",
  "nav.import": "استيراد خاص",
  "nav.agencies": "الوكلاء",
  "nav.how": "كيف يعمل",
  "nav.favorites": "المفضلة",
  "nav.login": "تسجيل الدخول",
  "nav.register": "إنشاء حساب",
  "nav.sell": "بِع سيارتك",
  "nav.dashboard": "لوحة التحكم",
  "search.placeholder": "ابحث عن سيارة، ماركة، موديل…",
  "search.button": "بحث",
  "hero.title": "اعثر على سيارتك التالية بثقة",
  "hero.subtitle":
    "سوق سيارات متكامل يجمع الأفراد والوكلاء وخدمة الاستيراد الخاص، محمي بضمان الدفع الآمن.",
  "hero.cta.browse": "تصفح السيارات",
  "hero.cta.sell": "بِع سيارتك",
  "hero.cta.import": "اطلب استيراد",
  "paths.title": "ثلاث طرق لشراء سيارتك",
  "paths.subtitle": "اختر المسار الأنسب لك",
  "path.c2c.title": "الشراء من الأفراد",
  "path.c2c.desc": "تصفح آلاف السيارات المستعملة المعروضة مباشرة من المالكين",
  "path.dealer.title": "الشراء من وكلاء موثقين",
  "path.dealer.desc": "سيارات جديدة ومستعملة من معارض ووكلاء تم التحقق منهم",
  "path.import.title": "استيراد سيارتك المطلوبة",
  "path.import.desc": "قدّم طلب استيراد واستقبل عروضاً تنافسية من الوكلاء",
  "featured.title": "سيارات مميزة",
  "featured.subtitle": "أحدث المعروض من السيارات المختارة",
  "featured.viewAll": "عرض الكل",
  "brands.title": "تصفح حسب الماركة",
  "agencies.title": "وكلاء موثقون",
  "agencies.subtitle": "معارض وشركات معتمدة بسمعة موثقة",
  "import.how.title": "كيف يعمل الاستيراد الخاص",
  "import.step1": "قدّم طلبك",
  "import.step1.desc": "حدد السيارة والمواصفات والميزانية",
  "import.step2": "استقبل العروض",
  "import.step2.desc": "يقدم الوكلاء الموثقون عروضهم",
  "import.step3": "قارن واختر",
  "import.step3.desc": "قارن الأسعار والمواصفات والسمعة",
  "import.step4": "الدفع الآمن",
  "import.step4.desc": "ادفع بأمان عبر خدمة الضمان",
  "import.step5": "تتبع الاستيراد",
  "import.step5.desc": "تابع الشحنة حتى الوصول",
  "trust.title": "معاملات آمنة ومحمية",
  "trust.subtitle": "منصة مبنية على الثقة",
  "trust.escrow": "دفع محمي بالضمان",
  "trust.escrow.desc": "أموالك محفوظة حتى استلام السيارة",
  "trust.verified": "هويات موثقة",
  "trust.verified.desc": "التحقق من كل بائع ومشتري",
  "trust.vehicle": "فحص السيارات",
  "trust.vehicle.desc": "تقارير فحص فني للسيارات المميزة",
  "trust.dispute": "دعم النزاعات",
  "trust.dispute.desc": "فريق مختص لحل الخلافات",
  "recent.title": "أضيفت حديثاً",
  "stats.listings": "سيارة معروضة",
  "stats.agencies": "وكيل موثق",
  "stats.deals": "صفقة مكتملة",
  "stats.users": "مستخدم نشط",
  "testimonials.title": "ماذا يقول عملاؤنا",
  "faq.title": "الأسئلة الشائعة",
  "cta.final.title": "جاهز تبدأ؟",
  "cta.final.subtitle": "انضم إلى آلاف المشترين والبائعين على سهلة درج",
  "footer.marketplace": "السوق",
  "footer.company": "الشركة",
  "footer.support": "الدعم",
  "footer.legal": "قانوني",
  "footer.newsletter": "النشرة البريدية",
  "footer.newsletter.desc": "اشترك لتصلك أحدث السيارات والعروض",
  "footer.newsletter.placeholder": "بريدك الإلكتروني",
  "footer.subscribe": "اشترك",
  "footer.rights": "جميع الحقوق محفوظة",
  "card.new": "جديدة",
  "card.used": "مستعملة",
  "card.verified": "موثقة",
  "card.featured": "مميزة",
  "card.km": "كم",
  "card.contact": "تواصل",
  "card.byAgency": "من وكيل",
  "card.byOwner": "من المالك",
  "agency.deals": "صفقة",
  "agency.vehicles": "سيارة",
  "agency.view": "زيارة الوكيل",
  "vehicles.title": "جميع السيارات",
  "c2c.title": "سيارات الأفراد",
  "dealers.title": "معارض ووكلاء",
  "import.title": "الاستيراد الخاص",
  "how.title": "كيف يعمل سهلة درج",
  "about.title": "من نحن",
  "contact.title": "تواصل معنا",
  "auth.login.title": "تسجيل الدخول",
  "auth.register.title": "إنشاء حساب جديد",
  "favorites.title": "المفضلة",
  "favorites.empty": "لا توجد سيارات في المفضلة بعد",
  "favorites.add": "إضافة إلى المفضلة",
  "favorites.remove": "إزالة من المفضلة",
  "state.error.title": "تعذر تحميل المحتوى",
  "state.error.description": "حدث خطأ مؤقت. يرجى المحاولة مرة أخرى.",
  "state.error.retry": "إعادة المحاولة",
  "state.vehicles.empty.title": "لا توجد سيارات",
  "state.vehicles.empty.description": "لا توجد سيارات متاحة حالياً.",
  "state.c2c.empty.title": "لا توجد سيارات أفراد",
  "state.c2c.empty.description": "لا توجد إعلانات من الأفراد حالياً.",
  "state.dealers.empty.title": "لا يوجد وكلاء",
  "state.dealers.empty.description": "لا يوجد وكلاء متاحون حالياً.",
  "state.dealer.empty.title": "لا توجد سيارات لدى هذا الوكيل",
  "state.dealer.empty.description": "لم يضف هذا الوكيل أي سيارات متاحة بعد.",
  "common.soon": "قريباً",
  "common.explore": "استكشف",
};

const en: Dict = {
  "brand.name": "Sahla Daraj",
  "brand.tagline": "The trusted automotive marketplace",
  "nav.c2c": "Individuals",
  "nav.dealers": "Dealers",
  "nav.import": "Custom Import",
  "nav.agencies": "Agencies",
  "nav.how": "How it works",
  "nav.favorites": "Favorites",
  "nav.login": "Log in",
  "nav.register": "Sign up",
  "nav.sell": "Sell your vehicle",
  "nav.dashboard": "Dashboard",
  "search.placeholder": "Search make, model, or keyword…",
  "search.button": "Search",
  "hero.title": "Find your next car with confidence",
  "hero.subtitle":
    "A complete automotive marketplace bringing individuals, verified dealers, and custom import into one protected experience.",
  "hero.cta.browse": "Browse vehicles",
  "hero.cta.sell": "Sell your vehicle",
  "hero.cta.import": "Request an import",
  "paths.title": "Three ways to buy your car",
  "paths.subtitle": "Choose the path that fits you",
  "path.c2c.title": "Buy from individuals",
  "path.c2c.desc": "Thousands of used vehicles listed directly by their owners",
  "path.dealer.title": "Buy from verified dealers",
  "path.dealer.desc": "New and used vehicles from verified agencies and dealers",
  "path.import.title": "Import your desired vehicle",
  "path.import.desc": "Submit an import request and receive competitive agency offers",
  "featured.title": "Featured vehicles",
  "featured.subtitle": "Hand-picked, freshly listed",
  "featured.viewAll": "View all",
  "brands.title": "Browse by make",
  "agencies.title": "Verified agencies",
  "agencies.subtitle": "Authorized dealers with verified reputation",
  "import.how.title": "How custom import works",
  "import.step1": "Submit your request",
  "import.step1.desc": "Specify vehicle, specs, and budget",
  "import.step2": "Receive offers",
  "import.step2.desc": "Verified agencies submit their bids",
  "import.step3": "Compare & choose",
  "import.step3.desc": "Compare price, specs, and reputation",
  "import.step4": "Secure payment",
  "import.step4.desc": "Pay safely through escrow",
  "import.step5": "Track import",
  "import.step5.desc": "Follow the shipment to arrival",
  "trust.title": "Safe and protected transactions",
  "trust.subtitle": "A platform built on trust",
  "trust.escrow": "Escrow-protected payments",
  "trust.escrow.desc": "Funds are held until the car is delivered",
  "trust.verified": "Verified identities",
  "trust.verified.desc": "Every seller and buyer is checked",
  "trust.vehicle": "Vehicle inspection",
  "trust.vehicle.desc": "Technical reports for featured vehicles",
  "trust.dispute": "Dispute support",
  "trust.dispute.desc": "A dedicated team to resolve conflicts",
  "recent.title": "Recently added",
  "stats.listings": "Vehicles listed",
  "stats.agencies": "Verified agencies",
  "stats.deals": "Completed deals",
  "stats.users": "Active users",
  "testimonials.title": "What our customers say",
  "faq.title": "Frequently asked questions",
  "cta.final.title": "Ready to get started?",
  "cta.final.subtitle": "Join thousands of buyers and sellers on Sahla Daraj",
  "footer.marketplace": "Marketplace",
  "footer.company": "Company",
  "footer.support": "Support",
  "footer.legal": "Legal",
  "footer.newsletter": "Newsletter",
  "footer.newsletter.desc": "Subscribe to get the latest vehicles and offers",
  "footer.newsletter.placeholder": "Your email",
  "footer.subscribe": "Subscribe",
  "footer.rights": "All rights reserved",
  "card.new": "New",
  "card.used": "Used",
  "card.verified": "Verified",
  "card.featured": "Featured",
  "card.km": "km",
  "card.contact": "Contact",
  "card.byAgency": "Dealer",
  "card.byOwner": "Owner",
  "agency.deals": "deals",
  "agency.vehicles": "vehicles",
  "agency.view": "View agency",
  "vehicles.title": "All vehicles",
  "c2c.title": "Individual listings",
  "dealers.title": "Dealers & agencies",
  "import.title": "Custom import",
  "how.title": "How Sahla Daraj works",
  "about.title": "About us",
  "contact.title": "Contact us",
  "auth.login.title": "Log in",
  "auth.register.title": "Create an account",
  "favorites.title": "Favorites",
  "favorites.empty": "No favorites yet",
  "favorites.add": "Add to favorites",
  "favorites.remove": "Remove from favorites",
  "state.error.title": "Unable to load content",
  "state.error.description": "A temporary error occurred. Please try again.",
  "state.error.retry": "Try again",
  "state.vehicles.empty.title": "No vehicles found",
  "state.vehicles.empty.description": "There are no vehicles available right now.",
  "state.c2c.empty.title": "No individual listings",
  "state.c2c.empty.description": "There are no individual listings available right now.",
  "state.dealers.empty.title": "No dealers found",
  "state.dealers.empty.description": "There are no dealers available right now.",
  "state.dealer.empty.title": "No vehicles from this dealer",
  "state.dealer.empty.description": "This dealer has not added any available vehicles yet.",
  "common.soon": "Coming soon",
  "common.explore": "Explore",
};

const dicts: Record<Locale, Dict> = { ar, en };

type Ctx = {
  locale: Locale;
  dir: "rtl" | "ltr";
  theme: Theme;
  setLocale: (l: Locale) => void;
  setTheme: (t: Theme) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const value: Ctx = {
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    theme,
    setLocale: setLocaleState,
    setTheme: setThemeState,
    t: (key) => dicts[locale][key] ?? key,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
