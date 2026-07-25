import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTenant } from "@/lib/store";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { PageHeader } from "@/components/layout/page-header";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShippingOriginSection } from "@/components/dashboard/shipping-origin-section";
import { BankAccountSection } from "@/components/dashboard/bank-account-section";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const tenant = useTenant((s) => s.tenant);
  const updateSettings = useTenant((s) => s.updateSettings);

  const [name, setName] = useState(tenant?.name ?? "");
  const [tagline, setTagline] = useState(tenant?.tagline ?? "");
  const [whatsapp, setWhatsapp] = useState(tenant?.whatsapp ?? "");
  const [avatar, setAvatar] = useState(tenant?.avatar ?? "");

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setTagline(tenant.tagline);
      setWhatsapp(tenant.whatsapp);
      setAvatar(tenant.avatar);
    }
  }, [tenant]);

  return (
    <div className="max-w-2xl space-y-10 bg-background text-foreground pb-12">
      <PageHeader label="Pengaturan" title="Identitas toko" />

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await updateSettings({ name, tagline, whatsapp, avatar });
            toast.success("Pengaturan toko berhasil disimpan");
          } catch (err: any) {
            toast.error(err.message || "Gagal menyimpan pengaturan");
          }
        }}
        className="space-y-6 border-b border-border pb-10"
      >
        <Field label="Nama toko">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Tagline">
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>
        <Field label="Nomor WhatsApp (628...)">
          <Input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
            placeholder="6281234567890"
            required
          />
        </Field>
        <Field label="Avatar / Logo Toko">
          <ImageUpload value={avatar} onChange={(url) => setAvatar(url)} />
        </Field>

        <div className="flex items-center gap-3">
          <Button type="submit">Simpan perubahan</Button>
        </div>
      </form>

      <div className="border-b border-border pb-10">
        <ShippingOriginSection />
      </div>

      <div>
        <BankAccountSection />
      </div>
    </div>
  );
}
