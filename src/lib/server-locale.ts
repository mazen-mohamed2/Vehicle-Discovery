import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  return (await cookies()).get("sd-locale")?.value === "en" ? "en" : "ar";
}

export const pageMetadata = {
  vehicles: {
    ar: [
      "جميع الإعلانات — سهلة درج",
      "تصفح السيارات والدراجات النارية والقوارب المعروضة من الأفراد والوكلاء.",
    ],
    en: [
      "Marketplace listings — Sahla Daraj",
      "Browse cars, motorcycles, and recreational boats listed by individuals and dealers.",
    ],
  },
  c2c: {
    ar: [
      "إعلانات الأفراد — سهلة درج",
      "سيارات ودراجات نارية وقوارب معروضة مباشرة من أصحابها في مصر.",
    ],
    en: [
      "C2C Marketplace — Sahla Daraj",
      "Browse cars, motorcycles, and recreational boats listed directly by their owners in Egypt.",
    ],
  },
  dealers: {
    ar: ["المعارض والوكلاء — سهلة درج", "وكلاء ومعارض معتمدون بسمعة موثقة على سهلة درج."],
    en: ["Dealers — Sahla Daraj", "Browse verified dealers and agencies on Sahla Daraj."],
  },
  import: {
    ar: [
      "الاستيراد الخاص — سهلة درج",
      "قدّم طلب استيراد سيارتك واستقبل عروضاً تنافسية من وكلاء موثقين.",
    ],
    en: [
      "Custom Import — Sahla Daraj",
      "Submit a vehicle import request and receive competitive offers from verified dealers.",
    ],
  },
  how: {
    ar: ["كيف يعمل سهلة درج", "تعرف على البحث والحماية وإتمام الصفقة والتوصيل."],
    en: [
      "How Sahla Daraj works",
      "Learn about vehicle search, protection, completing a deal, and delivery.",
    ],
  },
  about: {
    ar: ["من نحن — سهلة درج", "تعرف على منصة سهلة درج الموثوقة للسيارات."],
    en: ["About us — Sahla Daraj", "Learn about the trusted Sahla Daraj automotive marketplace."],
  },
  contact: {
    ar: ["تواصل معنا — سهلة درج", "تواصل مع فريق سهلة درج للاستفسارات والدعم."],
    en: ["Contact us — Sahla Daraj", "Contact the Sahla Daraj team for questions and support."],
  },
  favorites: {
    ar: ["المفضلة — سهلة درج", "السيارات التي أضفتها إلى المفضلة على سهلة درج."],
    en: ["Favorites — Sahla Daraj", "Vehicles you have saved to your Sahla Daraj favorites."],
  },
  login: {
    ar: ["تسجيل الدخول — سهلة درج", "تسجيل الدخول إلى حسابك على سهلة درج."],
    en: ["Log in — Sahla Daraj", "Log in to your Sahla Daraj account."],
  },
  register: {
    ar: ["إنشاء حساب — سهلة درج", "إنشاء حساب جديد على سهلة درج."],
    en: ["Create an account — Sahla Daraj", "Create a new Sahla Daraj account."],
  },
} as const;
