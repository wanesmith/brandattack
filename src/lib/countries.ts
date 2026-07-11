// The markets the storefront ships to. Kept in one place so the checkout
// address collection, the account address form, and (soon) localisation all
// agree on the same set.
export const SHIP_TO_COUNTRIES = [
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "ID", name: "Indonesia" },
  { code: "VN", name: "Vietnam" },
  { code: "PH", name: "Philippines" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
] as const;

export type CountryCode = (typeof SHIP_TO_COUNTRIES)[number]["code"];

export const SHIP_TO_CODES: CountryCode[] = SHIP_TO_COUNTRIES.map((c) => c.code);

export function countryName(code: string): string {
  return SHIP_TO_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
