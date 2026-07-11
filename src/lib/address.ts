// Shared shipping-address shape + parsers. No server-only deps so both the
// server (parsing stored order JSON) and the client form can import it.

export type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export const EMPTY_ADDRESS: ShippingAddress = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, 200) : "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function normalizeAddress(
  input: Record<string, unknown> | null | undefined
): ShippingAddress {
  const o = input ?? {};
  return {
    name: str(o.name),
    phone: str(o.phone),
    line1: str(o.line1),
    line2: str(o.line2),
    city: str(o.city),
    state: str(o.state),
    postalCode: str(o.postalCode),
    country: str(o.country),
  };
}

/** True if the address has enough to be worth saving/showing. */
export function hasAddress(a: ShippingAddress): boolean {
  return Boolean(a.line1 || a.city || a.postalCode);
}

/**
 * Parse the JSON stored on `orders.shippingAddress`, which comes from Stripe as
 * either a `shipping_details` object ({ name, phone?, address: {…} }) or a flat
 * address object ({ line1, city, postal_code, … }). Returns null if unusable.
 */
export function parseStripeAddress(json: string | null | undefined): ShippingAddress | null {
  if (!json) return null;
  let obj: Record<string, unknown>;
  try {
    obj = asRecord(JSON.parse(json));
  } catch {
    return null;
  }
  const addr = asRecord(obj.address ?? obj);
  const result = normalizeAddress({
    name: obj.name,
    phone: obj.phone,
    line1: addr.line1,
    line2: addr.line2,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postal_code ?? addr.postalCode,
    country: addr.country,
  });
  return hasAddress(result) ? result : null;
}

/** Parse our own saved (already-normalized) address JSON. */
export function parseSavedAddress(json: string | null | undefined): ShippingAddress | null {
  if (!json) return null;
  try {
    const a = normalizeAddress(asRecord(JSON.parse(json)));
    return hasAddress(a) ? a : null;
  } catch {
    return null;
  }
}
