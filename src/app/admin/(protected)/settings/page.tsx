import { getSettingsForAdmin } from "@/lib/settings";
import { SettingsEditor } from "./SettingsEditor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings — Admin",
  robots: { index: false, follow: false },
};

export default async function SettingsAdmin() {
  const fields = await getSettingsForAdmin();

  return (
    <div>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Branding and API credentials. Branding changes go live on the storefront
        immediately. Secret keys are stored securely and never shown again after saving.
      </p>
      <SettingsEditor fields={fields} />
    </div>
  );
}
