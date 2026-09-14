export function rootDocumentAttributes(locale: "ar" | "en", theme: "light" | "dark") {
  return {
    lang: locale,
    dir: locale === "ar" ? ("rtl" as const) : ("ltr" as const),
    className: theme === "dark" ? "dark" : "",
  };
}
