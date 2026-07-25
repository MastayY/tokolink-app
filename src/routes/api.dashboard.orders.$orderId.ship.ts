// src/routes/api.dashboard.orders.$orderId.ship.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { supabaseAdmin } from "@/lib/supabase.server";
import { createBiteshipOrder } from "@/lib/biteship";
import { sendEmailBuyerOrderShipped, notifyBuyerWhatsAppShipped } from "@/lib/notifications";

function parseCookie(cookieString: string, name: string): string | null {
  const match = cookieString.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

// This route is called from the dashboard — protected via Supabase access token cookie check.
// We verify the tenant owns the order before processing.
export const Route = createFileRoute("/api/dashboard/orders/$orderId/ship")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        // Auth: parse sb-access-token cookie used by Tokolink auth system
        const cookieHeader = request.headers.get("cookie") ?? "";
        const token = parseCookie(cookieHeader, "sb-access-token");
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const {
          data: { user: supaUser },
          error,
        } = await supabaseAdmin.auth.getUser(token);

        if (error || !supaUser) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findFirst({
          where: { user: { supabaseId: supaUser.id } },
          select: {
            id: true,
            name: true,
            slug: true,
            whatsapp: true,
            shippingOriginAreaId: true,
            shippingOriginLabel: true,
          },
        });

        if (!tenant) return Response.json({ error: "Tenant not found" }, { status: 404 });

        // Verify order belongs to this tenant
        const order = await prisma.order.findFirst({
          where: { id: params.orderId, tenantId: tenant.id },
          include: { items: true },
        });

        if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
        if (order.status !== "PAID" && order.status !== "PROCESSING") {
          return Response.json({ error: "Order status tidak valid untuk pengiriman" }, { status: 409 });
        }
        if (!tenant.shippingOriginAreaId) {
          return Response.json({ error: "Atur alamat asal pengiriman di Pengaturan dulu" }, { status: 422 });
        }

        // Book Biteship order
        let biteshipResult: { id: string; courier: { tracking_id: string } };
        try {
          biteshipResult = await createBiteshipOrder({
            originContactName: tenant.name,
            originContactPhone: tenant.whatsapp || "6281234567890",
            originAddress: tenant.shippingOriginLabel || tenant.name,
            originAreaId: tenant.shippingOriginAreaId,
            destinationContactName: order.buyerName,
            destinationContactPhone: order.buyerPhone,
            destinationAddress: order.shippingAddress,
            destinationAreaId: order.shippingAreaId,
            courierCompany: order.courierCompany ?? "",
            courierType: order.courierType ?? "",
            items: order.items.map((i) => ({
              name: i.productName,
              value: i.priceSnapshot,
              weight: i.weightGrams,
              quantity: i.qty,
            })),
          });
        } catch (err) {
          console.error("[api/dashboard/ship] Biteship error:", err);
          return Response.json({ error: "Gagal membuat resi di Biteship" }, { status: 502 });
        }

        const trackingNumber = biteshipResult.courier.tracking_id;
        const now = new Date();

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "SHIPPED",
            trackingNumber,
            biteshipOrderId: biteshipResult.id,
            shippedAt: now,
          },
        });

        // Notify buyer via email + WhatsApp (best-effort, fire-and-forget)
        void sendEmailBuyerOrderShipped({
          buyerName: order.buyerName,
          orderCode: order.orderCode,
          trackingNumber,
          courierCompany: order.courierCompany ?? "",
          storeSlug: tenant.slug,
        });
        void notifyBuyerWhatsAppShipped({
          buyerPhone: order.buyerPhone,
          orderCode: order.orderCode,
          trackingNumber,
          courierCompany: order.courierCompany ?? "",
          storeSlug: tenant.slug,
        });

        return Response.json({ success: true, trackingNumber });
      },
    },
  },
});
