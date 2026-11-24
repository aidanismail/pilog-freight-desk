const numberFormat = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  roundingMode: "floor"
});

// Decimal values from the API are strings. Intl can format them without converting to a float.
const formatDecimal = numberFormat.format as (value: string | number) => string;

export function fmt(value: unknown): string {
  if (typeof value !== "number" && typeof value !== "string") return "—";
  if ((typeof value === "string" && !value.trim()) || !Number.isFinite(Number(value))) return "—";
  return formatDecimal(value);
}
