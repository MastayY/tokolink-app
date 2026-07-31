import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTenant } from "@/lib/store";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import { PageHeader } from "@/components/layout/page-header";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AreaSearch } from "@/components/storefront/area-search";
import { useAreaSearch } from "@/hooks/use-area-search";
import { updateShippingOrigin, updateBankAccount } from "@/server/tenant.functions";

const BANK_OPTIONS = [
  { value: "bca", label: "BCA" },
  { value: "bri", label: "BRI" },
  { value: "bni", label: "BNI" },
  { value: "mandiri", label: "Mandiri" },
  { value: "cimb", label: "CIMB Niaga" },
  { value: "danamon", label: "Danamon" },
  { value: "permata", label: "Permata" },
  { value: "bsi", label: "BSI" },
  { value: "mega", label: "Bank Mega" },
  { value: "ocbc", label: "OCBC NISP" },
];

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const tenant = useTenant((s) => s.tenant);
  const setTenant = useTenant((s) => s.setTenant);
  const updateSettings = useTenant((s) => s.updateSettings);

  // Identity state
  const [name, setName] = useState(tenant?.name ?? "");
  const [tagline, setTagline] = useState(tenant?.tagline ?? "");
  const [whatsapp, setWhatsapp] = useState(tenant?.whatsapp ?? "");
  const [avatar, setAvatar] = useState(tenant?.avatar ?? "");

  // Shipping origin state
  const areaSearch = useAreaSearch();
  const [selectedArea, setSelectedArea] = useState<{ id: string; label: string } | null>(
    tenant?.shippingOriginAreaId
      ? { id: tenant.shippingOriginAreaId, label: tenant.shippingOriginLabel ?? "" }
      : null
  );

  // Bank account state
  const [bankCode, setBankCode] = useState(tenant?.bankCode ?? "");
  const [accountNumber, setAccountNumber] = useState(tenant?.bankAccountNumber ?? "");
  const [accountName, setAccountName] = useState(tenant?.bankAccountName ?? "");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setTagline(tenant.tagline);
      setWhatsapp(tenant.whatsapp);
      setAvatar(tenant.avatar);
      if (tenant.shippingOriginAreaId) {
        setSelectedArea({
          id: tenant.shippingOriginAreaId,
          label: tenant.shippingOriginLabel ?? "",
        });
      }
      setBankCode(tenant.bankCode ?? "");
      setAccountNumber(tenant.bankAccountNumber ?? "");
      setAccountName(tenant.bankAccountName ?? "");
    }
  }, [tenant]);

  async function handleSaveAll() {
    if (!name.trim()) {
      toast.error("Nama toko wajib diisi");
      return;
    }
    if (!whatsapp.trim()) {
      toast.error("Nomor WhatsApp wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const promises: Promise<any>[] = [];

      // 1. Update identity
      promises.push(updateSettings({ name, tagline, whatsapp, avatar }));

      // 2. Update shipping origin if selected
      if (selectedArea) {
        promises.push(
          updateShippingOrigin({
            data: {
              shippingOriginAreaId: selectedArea.id,
              shippingOriginLabel: selectedArea.label,
            },
          }).then((res) => {
            const current = useTenant.getState().tenant;
            if (current) {
              setTenant({
                ...current,
                shippingOriginAreaId: res.shippingOriginAreaId,
                shippingOriginLabel: res.shippingOriginLabel,
              } as any);
            }
          })
        );
      }

      // 3. Update bank account if fields provided
      if (bankCode || accountNumber || accountName) {
        if (!bankCode || !accountNumber || !accountName) {
          throw new Error("Mohon lengkapi semua data bank (Bank, Nomor Rekening, & Nama Pemilik)");
        }
        promises.push(
          updateBankAccount({
            data: { bankCode, bankAccountNumber: accountNumber, bankAccountName: accountName },
          }).then((res) => {
            const current = useTenant.getState().tenant;
            if (current) {
              setTenant({
                ...current,
                bankCode: res.bankCode,
                bankAccountNumber: res.bankAccountNumber,
                bankAccountName: res.bankAccountName,
              } as any);
            }
          })
        );
      }

      await Promise.all(promises);
      toast.success("Pengaturan toko berhasil disimpan");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Gagal menyimpan pengaturan"));
    } finally {
      setSaving(false);
    }
  }

  const headerAction = (
    <Button onClick={handleSaveAll} loading={saving}>
      {saving ? "Menyimpan..." : "Simpan semua perubahan"}
    </Button>
  );

  return (
    <div className="space-y-8 bg-background text-foreground pb-12 max-w-6xl w-full">
      <PageHeader
        label="Pengaturan"
        title="Pengaturan Toko"
        description="Kelola identitas toko, alamat pengiriman, dan rekening payout dalam satu tempat."
        action={headerAction}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── LEFT COLUMN: Store Identity ─────────────────────────────── */}
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xs h-fit">
          <h3 className="font-semibold text-lg border-b border-border pb-3">Identitas Toko</h3>

          <Field label="Nama toko">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={saving} required />
          </Field>

          <Field label="Tagline">
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={saving} />
          </Field>

          <Field label="Nomor WhatsApp (628...)">
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
              placeholder="6281234567890"
              disabled={saving}
              required
            />
          </Field>

          <Field label="Avatar / Logo Toko">
            <ImageUpload value={avatar} onChange={(url) => setAvatar(url)} />
          </Field>
        </div>

        {/* ── RIGHT COLUMN: Shipping & Bank Account ───────────────────── */}
        <div className="space-y-8">
          {/* Shipping Origin Section */}
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
            <div>
              <h3 className="font-semibold text-lg">Alamat Asal Pengiriman</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Digunakan Biteship untuk kalkulasi ongkos kirim ke pembeli.
              </p>
            </div>

            {selectedArea?.label && (
              <p className="text-sm bg-secondary/50 p-2.5 rounded-xl border border-border">
                Terpilih: <strong>{selectedArea.label}</strong>
              </p>
            )}

            <AreaSearch
              query={areaSearch.query}
              onQueryChange={areaSearch.setQuery}
              results={areaSearch.results}
              isLoading={areaSearch.isLoading}
              selected={selectedArea ? { id: selectedArea.id, name: "", label: selectedArea.label } : null}
              onSelect={(a) => setSelectedArea(a ? { id: a.id, label: a.label } : null)}
              placeholder="Cari kecamatan atau kota..."
            />
          </div>

          {/* Bank Account Section */}
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
            <div>
              <h3 className="font-semibold text-lg">Rekening Payout</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Dana dari penjualan akan ditransfer ke rekening ini secara otomatis.
              </p>
            </div>

            <Field>
              <Label htmlFor="bankCode">Bank</Label>
              <select
                id="bankCode"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                disabled={saving}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
              >
                <option value="">-- Pilih bank --</option>
                {BANK_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <Label htmlFor="accountNumber">Nomor Rekening</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="12345678901234"
                inputMode="numeric"
                disabled={saving}
              />
            </Field>

            <Field>
              <Label htmlFor="accountName">Nama Pemilik Rekening</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Sesuai nama di buku tabungan"
                disabled={saving}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Mobile Save Button */}
      <div className="lg:hidden sticky bottom-4 z-20 flex justify-end">
        <Button onClick={handleSaveAll} loading={saving} size="lg" className="shadow-xl">
          {saving ? "Menyimpan..." : "Simpan semua perubahan"}
        </Button>
      </div>
    </div>
  );
}
