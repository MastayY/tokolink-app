/**
 * Notification wrapper — Email (Resend) + WhatsApp (Fonnte).
 * SERVER-ONLY. All senders are fire-and-forget: errors are logged, not thrown.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FONNTE_URL = "https://api.fonnte.com/send";

// ── Email ─────────────────────────────────────────────────────────────────────

export async function sendEmailSellerNewOrder(params: {
  sellerEmail: string;
  sellerName: string;
  orderCode: string;
  buyerName: string;
  subtotal: number;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: "Tokolink <noreply@tokolink.app>",
      to: params.sellerEmail,
      subject: `Pesanan baru masuk — ${params.orderCode}`,
      html: `<p>Halo <strong>${params.sellerName}</strong>,</p>
<p>Ada pesanan baru dari <strong>${params.buyerName}</strong>.</p>
<p>Kode: <strong>${params.orderCode}</strong> | Subtotal: <strong>Rp${params.subtotal.toLocaleString("id-ID")}</strong></p>
<p><a href="https://tokolink.app/dashboard/orders">Lihat pesanan →</a></p>`,
    });
  } catch (err) {
    console.error("[notifications] email seller-new-order failed:", err);
  }
}

export async function sendEmailBuyerOrderShipped(params: {
  buyerName: string;
  orderCode: string;
  trackingNumber: string;
  courierCompany: string;
  storeSlug: string;
  buyerEmail?: string;
}): Promise<void> {
  if (!params.buyerEmail) return;
  try {
    await resend.emails.send({
      from: "Tokolink <noreply@tokolink.app>",
      to: params.buyerEmail,
      subject: `Pesananmu sudah dikirim — ${params.orderCode}`,
      html: `<p>Halo <strong>${params.buyerName}</strong>,</p>
<p>Pesanan <strong>${params.orderCode}</strong> sudah dikirim via <strong>${params.courierCompany.toUpperCase()}</strong>.</p>
<p>Nomor resi: <strong>${params.trackingNumber}</strong></p>
<p><a href="https://tokolink.app/${params.storeSlug}/order/${params.orderCode}">Cek status →</a></p>`,
    });
  } catch (err) {
    console.error("[notifications] email buyer-order-shipped failed:", err);
  }
}

// ── WhatsApp via Fonnte ───────────────────────────────────────────────────────

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  try {
    const res = await fetch(FONNTE_URL, {
      method: "POST",
      headers: {
        Authorization: process.env.FONNTE_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phone,
        message,
        device: process.env.FONNTE_DEVICE_TOKEN,
      }),
    });
    if (!res.ok) {
      console.error("[notifications] Fonnte error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[notifications] WhatsApp send failed:", err);
  }
}

export async function notifySellerWhatsAppNewOrder(params: {
  sellerPhone: string;
  orderCode: string;
  buyerName: string;
  subtotal: number;
}): Promise<void> {
  await sendWhatsApp(
    params.sellerPhone,
    `🛍️ *Pesanan baru masuk!*\n\nKode: *${params.orderCode}*\nDari: ${params.buyerName}\nSubtotal: Rp${params.subtotal.toLocaleString("id-ID")}\n\nBuka dashboard: https://tokolink.app/dashboard/orders`
  );
}
