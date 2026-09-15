export type RootDocumentAttributes = {
  lang: "ar" | "en";
  dir: "rtl" | "ltr";
  className: "dark" | "";
};

type MutableRootDocument = {
  lang: string;
  dir: string;
  className: string;
};

export function rootDocumentAttributes(
  locale: "ar" | "en",
  theme: "light" | "dark",
): RootDocumentAttributes {
  return {
    lang: locale,
    dir: locale === "ar" ? ("rtl" as const) : ("ltr" as const),
    className: theme === "dark" ? "dark" : "",
  };
}

export function applyRootDocumentAttributes(
  root: MutableRootDocument,
  attributes: RootDocumentAttributes,
) {
  root.lang = attributes.lang;
  root.dir = attributes.dir;
  root.className = attributes.className;
}

export function rootDocumentBootstrapScript(attributes: RootDocumentAttributes) {
  const serialized = JSON.stringify(attributes);
  return `(()=>{const root=document.documentElement;const attributes=${serialized};root.lang=attributes.lang;root.dir=attributes.dir;root.className=attributes.className;})();`;
}
