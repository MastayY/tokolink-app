// src/lib/shipping-label.tsx
// SERVER-ONLY — hanya diimport dari API routes, tidak dari client components.
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import bwipjs from "bwip-js";
import { readFileSync } from "fs";
import { join } from "path";
import { maskName, maskPhone } from "@/lib/mask";
import { LABEL_SIZES, isValidLabelSize } from "@/lib/label-sizes";

export { LABEL_SIZES, isValidLabelSize } from "@/lib/label-sizes";
export type { LabelSizeKey } from "@/lib/label-sizes";

// ── Logo helper — cached at module scope ──────────────────────────────────────
// react-pdf <Image> requires raster (PNG/JPG). public/logo.svg is vector.
// tryGetLogoDataUrl() checks for public/logo-tokolink.png (PNG override).
// If not found, route falls back to text "tokolink" in the PDF header.
let _cachedLogoDataUrl: string | null | undefined = undefined;

export function tryGetLogoDataUrl(): string | null {
  if (_cachedLogoDataUrl !== undefined) return _cachedLogoDataUrl;
  try {
    const buf = readFileSync(join(process.cwd(), "public", "logo-tokolink.png"));
    _cachedLogoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    _cachedLogoDataUrl = null;
  }
  return _cachedLogoDataUrl;
}

// ── Barcode generator ─────────────────────────────────────────────────────────
export async function generateBarcodeDataUrl(trackingNumber: string): Promise<string> {
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text: trackingNumber,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
  });
  return `data:image/png;base64,${png.toString("base64")}`;
}

// ── PDF Styles ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:         { padding: 10, fontSize: 8, fontFamily: "Helvetica" },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#000000" },
  brandText:    { fontSize: 13, fontFamily: "Helvetica-Bold" },
  courierBadge: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  logoImg:      { width: 70, height: 22, objectFit: "contain" },
  section:      { marginBottom: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: "#DDDDDD" },
  sectionLast:  { marginBottom: 5 },
  sectionLabel: { fontSize: 6.5, color: "#888888", marginBottom: 2 },
  value:        { fontSize: 10, fontFamily: "Helvetica-Bold" },
  small:        { fontSize: 8 },
  italic:       { fontSize: 7.5, color: "#555555" },
  itemRow:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 1.5 },
  barcode:      { width: "80%", height: 45, marginTop: 8, alignSelf: "center" },
});

// ── Data types ────────────────────────────────────────────────────────────────
export interface ShippingLabelItem {
  name: string;
  variantName?: string | null;
  qty: number;
}

export interface ShippingLabelData {
  orderCode: string;
  courierCompany: string;
  courierType: string;
  shippingCost: number;
  trackingNumber: string;
  senderName: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  packageNote?: string | null;
  totalWeightGrams: number;
  items: ShippingLabelItem[];
}

// ── PDF Document component ────────────────────────────────────────────────────
export function ShippingLabelDocument({
  data,
  barcodeDataUrl,
  logoDataUrl,
  size = "thermal_8x10",
}: {
  data: ShippingLabelData;
  barcodeDataUrl: string;
  logoDataUrl: string | null;
  size?: LabelSizeKey;
}) {
  const dims = LABEL_SIZES[size];

  return (
    <Document>
      <Page size={[dims.widthPt, dims.heightPt]} style={S.page}>

        {/* Header: logo + courier */}
        <View style={S.header}>
          {logoDataUrl
            ? <Image src={logoDataUrl} style={S.logoImg} />
            : <Text style={S.brandText}>tokolink</Text>
          }
          <Text style={S.courierBadge}>
            {data.courierCompany.toUpperCase()} · {data.courierType.toUpperCase()}
          </Text>
        </View>

        {/* Tracking number + order info */}
        <View style={S.section}>
          <Text style={S.sectionLabel}>NOMOR RESI</Text>
          <Text style={S.value}>{data.trackingNumber}</Text>
          <Text style={S.small}>
            {data.orderCode}{"  |  "}Ongkir: Rp{data.shippingCost.toLocaleString("id-ID")}
          </Text>
        </View>

        {/* Recipient (masked) */}
        <View style={S.section}>
          <Text style={S.sectionLabel}>PENERIMA</Text>
          <Text style={S.value}>{maskName(data.receiverName)}</Text>
          <Text style={S.small}>{maskPhone(data.receiverPhone)}</Text>
          <Text style={S.small}>{data.receiverAddress}</Text>
        </View>

        {/* Sender */}
        <View style={S.section}>
          <Text style={S.sectionLabel}>PENGIRIM</Text>
          <Text style={S.value}>{data.senderName}</Text>
          <Text style={S.small}>{data.senderAddress}</Text>
        </View>

        {/* Package contents */}
        <View style={data.packageNote ? S.section : S.sectionLast}>
          <Text style={S.sectionLabel}>ISI PAKET ({data.totalWeightGrams}g)</Text>
          {data.items.map((item, i) => (
            <View key={i} style={S.itemRow}>
              <Text style={S.small}>
                {item.name}{item.variantName ? ` — ${item.variantName}` : ""}
              </Text>
              <Text style={S.small}>{item.qty}x</Text>
            </View>
          ))}
        </View>

        {/* Package note (optional) */}
        {data.packageNote ? (
          <View style={S.sectionLast}>
            <Text style={S.sectionLabel}>CATATAN</Text>
            <Text style={S.italic}>{data.packageNote}</Text>
          </View>
        ) : null}

        {/* Barcode */}
        <Image src={barcodeDataUrl} style={S.barcode} />

      </Page>
    </Document>
  );
}
