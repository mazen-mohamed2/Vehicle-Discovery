"use client";

import { useEffect } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isArabic = typeof document !== "undefined" && document.cookie.includes("sd-locale=ar");
  const copy = isArabic
    ? {
        title: "تعذر تحميل الصفحة",
        description: "حدث خطأ من جانبنا. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.",
        retry: "حاول مرة أخرى",
        home: "الصفحة الرئيسية",
      }
    : {
        title: "This page didn't load",
        description: "Something went wrong on our end. You can try again or head back home.",
        retry: "Try again",
        home: "Go home",
      };
  useEffect(() => {
    reportLovableError(error, { boundary: "nextjs_global_error_component" });
  }, [error]);

  return (
    <html lang={isArabic ? "ar" : "en"} dir={isArabic ? "rtl" : "ltr"}>
      <body>
        <div
          style={{
            font: "15px/1.5 system-ui, -apple-system, sans-serif",
            background: "#fafafa",
            color: "#111",
            display: "grid",
            placeItems: "center",
            minHeight: "100vh",
            margin: 0,
            padding: "1.5rem",
          }}
        >
          <div style={{ maxWidth: "28rem", width: "100%", textAlign: "center", padding: "2rem" }}>
            <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>{copy.title}</h1>
            <p style={{ color: "#4b5563", margin: "0 0 1.5rem" }}>{copy.description}</p>
            <div
              style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}
            >
              <button
                onClick={() => reset()}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  background: "#111",
                  color: "#fff",
                  border: "1px solid transparent",
                }}
              >
                {copy.retry}
              </button>
              <a
                href="/"
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  textDecoration: "none",
                  background: "#fff",
                  color: "#111",
                  border: "1px solid #d1d5db",
                }}
              >
                {copy.home}
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
