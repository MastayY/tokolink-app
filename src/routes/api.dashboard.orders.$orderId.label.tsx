// src/routes/api.dashboard.orders.$orderId.label.ts
import { createFileRoute } from "@tanstack/react-router";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/db";
import { supabaseAdmin } from "@/lib/supabase.server";
import {
  generateBarcodeDataUrl,
  tryGetLogoDataUrl,
  ShippingLabelDocument,
  isValidLabelSize,
} from "@/lib/shipping-label";

function parseCookie(cookieString: string, name: string): string | null {
  const match = cookieString.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

export const Route = createFileRoute("/api/dashboard/orders/$orderId/label")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // ── Auth (same pattern as ship route) ─────────────────────────────
        const cookieHeader = request.headers.get("cookie") ?? "";
        const token = parseCookie(cookieHeader, "sb-access-token");
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const {
          data: { user: supaUser },
          error,
        } = await supabaseAdmin.auth.getUser(token);
        if (error || !supaUser)
          return Response.json({ error: "Unauthorized" }, { status: 401 });

        const tenant = await prisma.tenant.findFirst({
          where: { user: { supabaseId: supaUser.id } },
          select: { id: true, name: true, shippingOriginLabel: true },
        });
        if (!tenant)
          return Response.json({ error: "Tenant not found" }, { status: 404 });

        // ── Size query param ──────────────────────────────────────────────
        const url = new URL(request.url);
        const sizeParam = url.searchParams.get("size") ?? "thermal_8x10";
        const size = isValidLabelSize(sizeParam) ? sizeParam : "thermal_8x10";

        // ── Fetch order — tenantId guard prevents cross-seller access ─────
        const order = await prisma.order.findFirst({
          where: { id: params.orderId, tenantId: tenant.id },
          include: { items: true },
        });

        if (!order)
          return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });

        if (!order.trackingNumber || !order.courierCompany)
          return Response.json(
            { error: "Pesanan belum dikirim — nomor resi belum tersedia" },
            { status: 400 }
          );

        // ── Build PDF ─────────────────────────────────────────────────────
        const totalWeightGrams = order.items.reduce(
          (sum, item) => sum + item.weightGrams * item.qty,
          0
        );

        const [barcodeDataUrl] = await Promise.all([
          generateBarcodeDataUrl(order.trackingNumber),
        ]);
        const logoDataUrl = tryGetLogoDataUrl();

        const pdfBuffer = await renderToBuffer(
          <ShippingLabelDocument
            data={{
              orderCode: order.orderCode,
              courierCompany: order.courierCompany,
              courierType: order.courierType ?? "",
              shippingCost: order.shippingCost,
              trackingNumber: order.trackingNumber,
              senderName: tenant.name,
              senderAddress: tenant.shippingOriginLabel ?? "Alamat toko",
              receiverName: order.buyerName,
              receiverPhone: order.buyerPhone,
              receiverAddress: `${order.shippingAddress}, ${order.shippingAreaLabel}`,
              packageNote: order.packageNote ?? null,
              totalWeightGrams,
              items: order.items.map((i) => ({
                name: i.productName,
                variantName: i.variantName,
                qty: i.qty,
              })),
            }}
            barcodeDataUrl={barcodeDataUrl}
            logoDataUrl={logoDataUrl}
            size={size}
          />
        );

        return new Response(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="label-${order.orderCode}-${size}.pdf"`,
          },
        });
      },
    },
  },
});
