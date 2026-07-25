// src/components/dashboard/shipping-origin-section.tsx
import { useState } from "react";
import { AreaSearch } from "@/components/storefront/area-search";
import { useAreaSearch } from "@/hooks/use-area-search";
import { Button } from "@/components/ui/button";
import { updateShippingOrigin } from "@/server/tenant.functions";
import { useTenant } from "@/lib/store";
import { toast } from "sonner";

export function ShippingOriginSection() {
  const tenant = useTenant((s) => s.tenant);
  const setTenant = useTenant((s) => s.setTenant);
  const areaSearch = useAreaSearch();
  const [selectedArea, setSelectedArea] = useState<{ id: string; label: string } | null>(
    tenant?.shippingOriginAreaId
      ? { id: tenant.shippingOriginAreaId, label: tenant.shippingOriginLabel ?? "" }
      : null
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!selectedArea) return;
    setSaving(true);
    try {
      await updateShippingOrigin({
        data: {
          shippingOriginAreaId: selectedArea.id,
          shippingOriginLabel: selectedArea.label,
        },
      });
      setTenant({ ...tenant!, shippingOriginAreaId: selectedArea.id, shippingOriginLabel: selectedArea.label } as any);
      toast.success("Alamat asal pengiriman disimpan");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base">Alamat Asal Pengiriman</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Digunakan Biteship untuk kalkulasi ongkos kirim ke pembeli.
        </p>
      </div>

      {tenant?.shippingOriginLabel && (
        <p className="text-sm">
          Saat ini: <strong>{tenant.shippingOriginLabel}</strong>
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

      <Button onClick={handleSave} disabled={!selectedArea || saving}>
        {saving ? "Menyimpan..." : "Simpan Alamat Asal"}
      </Button>
    </div>
  );
}
