// src/components/dashboard/bank-account-section.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { updateBankAccount } from "@/server/tenant.functions";
import { useTenant } from "@/lib/store";
import { toast } from "sonner";

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

export function BankAccountSection() {
  const tenant = useTenant((s) => s.tenant);
  const setTenant = useTenant((s) => s.setTenant);
  const [bankCode, setBankCode] = useState(tenant?.bankCode ?? "");
  const [accountNumber, setAccountNumber] = useState(tenant?.bankAccountNumber ?? "");
  const [accountName, setAccountName] = useState(tenant?.bankAccountName ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateBankAccount({
        data: { bankCode, bankAccountNumber: accountNumber, bankAccountName: accountName },
      });
      setTenant({ ...tenant!, bankCode, bankAccountNumber: accountNumber, bankAccountName: accountName } as any);
      toast.success("Informasi rekening disimpan");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan rekening");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base">Rekening Payout</h3>
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
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
        >
          <option value="">-- Pilih bank --</option>
          {BANK_OPTIONS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
      </Field>

      <Field>
        <Label htmlFor="accountNumber">Nomor Rekening</Label>
        <Input
          id="accountNumber"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="12345678901234"
          inputMode="numeric"
        />
      </Field>

      <Field>
        <Label htmlFor="accountName">Nama Pemilik Rekening</Label>
        <Input
          id="accountName"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="Sesuai nama di buku tabungan"
        />
      </Field>

      <Button
        onClick={handleSave}
        disabled={!bankCode || !accountNumber || !accountName || saving}
      >
        {saving ? "Menyimpan..." : "Simpan Rekening"}
      </Button>
    </div>
  );
}
