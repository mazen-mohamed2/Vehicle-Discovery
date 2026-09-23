export const currencyPrecision = { EGP: 2, USD: 2 } as const;
export type MoneyCurrency = keyof typeof currencyPrecision;
export class MoneyValidationError extends Error {
  constructor(public readonly code: "precision" | "positive" | "currency") {
    super(code);
  }
}
export function fractionDigits(value: number) {
  const [mantissa, exponent = "0"] = String(value).toLowerCase().split("e");
  return Math.max(0, (mantissa.split(".")[1]?.length ?? 0) - Number(exponent));
}
function normalizedDecimal(text: string) {
  const [whole, fraction = ""] = text.split(".");
  return `${whole.replace(/^0+/, "") || "0"}.${fraction.replace(/0+$/, "")}`;
}
/** Validate raw precision BEFORE Number conversion; never round money into validity. */
export function parseMoney(value: string | number, currency: MoneyCurrency): number {
  if (!Object.hasOwn(currencyPrecision, currency)) throw new MoneyValidationError("currency");
  if (typeof value === "string") {
    const text = value
      .trim()
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
      .replace(/٫/g, ".");
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) throw new MoneyValidationError("positive");
    if ((text.split(".")[1]?.length ?? 0) > currencyPrecision[currency])
      throw new MoneyValidationError("precision");
    value = Number(text);
    if (normalizedDecimal(text) !== normalizedDecimal(String(value)))
      throw new MoneyValidationError("positive");
  }
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value > Number.MAX_SAFE_INTEGER / 10 ** currencyPrecision[currency]
  )
    throw new MoneyValidationError("positive");
  if (fractionDigits(value) > currencyPrecision[currency])
    throw new MoneyValidationError("precision");
  return value;
}
/** Display only: legacy over-precision values remain visible, never normalized or persisted. */
export function formatMoney(
  value: number,
  currency: MoneyCurrency,
  locale: "ar" | "en",
  minimumFractionDigits = 0,
) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    ...(fractionDigits(value) > currencyPrecision[currency]
      ? { maximumSignificantDigits: 21 }
      : { minimumFractionDigits, maximumFractionDigits: currencyPrecision[currency] }),
  }).format(value);
}
