import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/settings";

const API_VERSION = "2026-05-27.dahlia";

// The secret key now comes from the DB (admin Settings) with an env fallback,
// so it can change at runtime. Cache the client per key to avoid rebuilding it
// on every request while still picking up a key change immediately.
let cached: { key: string; client: Stripe } | null = null;

export async function getStripe(): Promise<Stripe | null> {
  const key = await getStripeSecretKey();
  if (!key) return null;
  if (cached && cached.key === key) return cached.client;
  const client = new Stripe(key, { apiVersion: API_VERSION });
  cached = { key, client };
  return client;
}

export async function requireStripe(): Promise<Stripe> {
  const client = await getStripe();
  if (!client) {
    throw new Error(
      "Stripe is not configured. Add a secret key in Admin → Settings, or set STRIPE_SECRET_KEY in the environment (get one from https://dashboard.stripe.com/test/apikeys)."
    );
  }
  return client;
}
