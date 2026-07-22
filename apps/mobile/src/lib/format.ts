/** Formats a decimal string (as returned by the API) into a `₦` price. */
export function formatNaira(price: string) {
  const value = Number(price);
  if (Number.isNaN(value)) return `₦${price}`;
  const [whole, decimals] = value.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₦${grouped}.${decimals}`;
}

/** Compact `₦` amount for tight spaces (e.g. chart labels): ₦0, ₦1.2k, ₦3.4m. */
export function formatCompactNaira(value: number) {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(1)}k`;
  return `₦${Math.round(value)}`;
}
