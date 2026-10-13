import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const rows = await prisma.systemSetting.findMany();
  const initial = Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)])) as {
    platform_monthly_fee?: number;
    default_currency?: string;
    support_email?: string;
    maintenance_mode?: boolean;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="System settings"
        description="Platform-wide configuration. Changes are audited against your Super Admin identity."
      />
      <SettingsForm initial={initial} />
    </div>
  );
}
