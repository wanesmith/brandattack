"use client";
import { useState } from "react";
import { EMPTY_ADDRESS, type ShippingAddress } from "@/lib/address";
import { SHIP_TO_COUNTRIES } from "@/lib/countries";
import { useT } from "@/components/i18n/LocaleProvider";

const FIELDS: { key: keyof ShippingAddress; labelKey: string; required?: boolean; half?: boolean }[] = [
  { key: "name", labelKey: "account.fieldName" },
  { key: "phone", labelKey: "account.fieldPhone" },
  { key: "line1", labelKey: "account.fieldLine1", required: true },
  { key: "line2", labelKey: "account.fieldLine2" },
  { key: "city", labelKey: "account.fieldCity", required: true, half: true },
  { key: "state", labelKey: "account.fieldState", half: true },
  { key: "postalCode", labelKey: "account.fieldPostal", half: true },
];

export function AddressForm({
  initial,
  canImport,
}: {
  initial: ShippingAddress | null;
  canImport: boolean;
}) {
  const { t } = useT();
  const [addr, setAddr] = useState<ShippingAddress>(initial ?? EMPTY_ADDRESS);
  const [status, setStatus] = useState<"idle" | "saving" | "importing" | "saved">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof ShippingAddress>(key: K, value: string) {
    setAddr((a) => ({ ...a, [key]: value }));
    setStatus("idle");
  }

  async function importFromStripe() {
    setStatus("importing");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/account/address?source=last-order");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setAddr({ ...EMPTY_ADDRESS, ...data.address });
      setMsg(t("account.importedMsg"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setStatus("idle");
    }
  }

  async function save() {
    setStatus("saving");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/account/address", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(addr),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setStatus("saved");
      setMsg(t("account.savedMsg"));
    } catch (e) {
      setStatus("idle");
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const inputCls =
    "mt-1 w-full rounded-sm border border-rule bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none";

  return (
    <div className="mt-4 rounded-sm border border-rule p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={f.half ? "" : "sm:col-span-2"}>
            <span className="text-xs text-ink/60">
              {t(f.labelKey)}
              {f.required && <span className="text-accent"> *</span>}
            </span>
            <input
              type="text"
              value={addr[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              className={inputCls}
              autoComplete={autoCompleteFor(f.key)}
            />
          </label>
        ))}
        <label>
          <span className="text-xs text-ink/60">
            {t("account.fieldCountry")}<span className="text-accent"> *</span>
          </span>
          <select
            value={addr.country}
            onChange={(e) => set("country", e.target.value)}
            className={inputCls}
          >
            <option value="">{t("account.selectPlaceholder")}</option>
            {SHIP_TO_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
          className="rounded-sm bg-accent px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-60"
        >
          {status === "saving" ? t("account.saving") : t("account.saveAddress")}
        </button>
        {canImport && (
          <button
            type="button"
            onClick={importFromStripe}
            disabled={status === "importing"}
            className="rounded-sm border border-rule px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-ink hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {status === "importing" ? t("account.importing") : t("account.importFromLast")}
          </button>
        )}
        {msg && <span className="text-xs text-emerald-600">{msg}</span>}
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </div>
  );
}

function autoCompleteFor(key: keyof ShippingAddress): string {
  switch (key) {
    case "name":
      return "name";
    case "phone":
      return "tel";
    case "line1":
      return "address-line1";
    case "line2":
      return "address-line2";
    case "city":
      return "address-level2";
    case "state":
      return "address-level1";
    case "postalCode":
      return "postal-code";
    default:
      return "off";
  }
}
