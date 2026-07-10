import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const divisionEnum = pgEnum("division", ["APPAREL", "FOOTWEAR", "HARDWARE"]);
export const genderEnum = pgEnum("gender", ["MEN", "WOMEN", "UNISEX", "KIDS"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "shipped",
  "refunded",
  "cancelled",
]);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    articleNo: text("article_no").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    brand: text("brand").notNull().default("Adidas"),
    division: divisionEnum("division").notNull(),
    gender: genderEnum("gender").notNull(),
    sportsCode: text("sports_code").notNull().default(""),
    productGroup: text("product_group").notNull().default(""),
    productType: text("product_type").notNull().default(""),
    season: text("season").notNull().default(""),
    rrpUsd: numeric("rrp_usd", { precision: 10, scale: 2 }).notNull(),
    priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_products_division").on(t.division),
    index("idx_products_gender").on(t.gender),
    index("idx_products_active").on(t.active),
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    url: text("url").notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.position] })]
);

export const variants = pgTable(
  "variants",
  {
    sku: text("sku").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    sizeLabel: text("size_label").notNull(),
    stock: integer("stock").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
  },
  (t) => [index("idx_variants_product").on(t.productId)]
);

// Short-lived hold while a Stripe Checkout session is open.
// Cleared by the webhook (on completion) or by a janitor sweep (on expiry).
export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sku: text("sku")
      .notNull()
      .references(() => variants.sku, { onDelete: "cascade" }),
    qty: integer("qty").notNull(),
    stripeSessionId: text("stripe_session_id").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_reservations_session").on(t.stripeSessionId),
    index("idx_reservations_expires").on(t.expiresAt),
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    stripeSessionId: text("stripe_session_id").notNull().unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    status: orderStatusEnum("status").notNull().default("pending"),
    subtotalUsd: numeric("subtotal_usd", { precision: 10, scale: 2 }).notNull(),
    shippingUsd: numeric("shipping_usd", { precision: 10, scale: 2 }).notNull().default("0"),
    taxUsd: numeric("tax_usd", { precision: 10, scale: 2 }).notNull().default("0"),
    totalUsd: numeric("total_usd", { precision: 10, scale: 2 }).notNull(),
    shippingAddress: text("shipping_address"), // JSON-serialised Stripe address
    trackingNumber: text("tracking_number"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("idx_orders_status").on(t.status), index("idx_orders_email").on(t.email)]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    productTitle: text("product_title").notNull(),
    sizeLabel: text("size_label").notNull(),
    qty: integer("qty").notNull(),
    unitPriceUsd: numeric("unit_price_usd", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [index("idx_order_items_order").on(t.orderId)]
);

// Filter configuration — admin-controlled labels/visibility/order
// for the shop sidebar. Facets reference product columns by id (e.g.,
// 'division', 'gender', 'sportsCode', 'productGroup', 'season').
export const facets = pgTable("facets", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  position: integer("position").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
});

export const facetValues = pgTable(
  "facet_values",
  {
    facet: text("facet")
      .notNull()
      .references(() => facets.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    label: text("label").notNull(),
    position: integer("position").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.facet, t.value] }),
    index("idx_facet_values_facet").on(t.facet),
  ]
);

// Customer accounts for the storefront. Separate from the admin console
// (which uses a single shared password). Email is stored lower-cased so the
// unique constraint is effectively case-insensitive.
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("idx_users_email").on(t.email)]
);

// Single-use tokens for email verification and password reset. We store only
// the SHA-256 hash of the token; the raw value lives only in the emailed link.
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "verify_email" | "password_reset"
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_auth_tokens_user").on(t.userId),
    index("idx_auth_tokens_hash").on(t.tokenHash),
  ]
);

// Site configuration — key/value store edited from the admin Settings page.
// Holds branding (site name, wordmark, tagline, announcements, support email)
// and API credentials (Stripe keys). Secrets stored here take precedence over
// the matching env var; an empty/absent row falls back to env.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Server-side snapshot of shopper carts, synced from the client cart store
// whenever it changes. Powers the admin "Abandoned carts" view: a cart that
// still has items but hasn't been touched for a while. The client clears the
// cart (→ empty sync here) when a checkout completes, so converted carts drop
// out of the abandoned list. `id` is a client-generated id kept in localStorage.
export const carts = pgTable(
  "carts",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email"),
    items: text("items").notNull().default("[]"), // JSON: [{sku,title,sizeLabel,qty,priceUsd}]
    itemCount: integer("item_count").notNull().default(0),
    subtotalUsd: numeric("subtotal_usd", { precision: 10, scale: 2 }).notNull().default("0"),
    recoverySentAt: timestamp("recovery_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("idx_carts_updated").on(t.updatedAt)]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Variant = typeof variants.$inferSelect;
export type NewVariant = typeof variants.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Facet = typeof facets.$inferSelect;
export type FacetValue = typeof facetValues.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthToken = typeof authTokens.$inferSelect;
export type Cart = typeof carts.$inferSelect;
