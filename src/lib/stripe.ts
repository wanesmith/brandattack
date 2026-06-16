import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  // Don't throw at import time so the rest of the app can still build/render.
  // Routes that actually need Stripe should call `requireStripe()` and surface
  // a clear error if it's missing.
  console.warn("STRIPE_SECRET_KEY is not set — checkout/webhook routes will fail until it is.");
}

export const stripe = key
  ? new Stripe(key, { apiVersion: "2026-05-27.dahlia" })
  : null;

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local (get one from https://dashboard.stripe.com/test/apikeys)."
    );
  }
  return stripe;
}
