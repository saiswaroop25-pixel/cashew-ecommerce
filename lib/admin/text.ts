/** URL slug from a product name: lowercase, ascii, hyphen-separated. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Rupees typed by an admin ("499", "499.5", "1,299.00") -> integer paise, or null if invalid. */
export function rupeesToPaise(input: string | number): number | null {
  const s = String(input).trim().replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export function paiseToRupeesString(paise: number): string {
  return (paise / 100).toFixed(2).replace(/\.00$/, "");
}
