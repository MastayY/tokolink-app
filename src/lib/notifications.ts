/**
 * Notification wrapper — Email (Resend) + WhatsApp (Fonnte).
 * SERVER-ONLY. All senders are fire-and-forget: errors are logged, not thrown.
 *
 * Email design system: dark-mode card matching Tokolink brand.
 * bg #0A0A0A | container #121212 | border #1F1F1F | accent #D4FF33
 */
import { Resend } from "resend";
import { getAppUrl } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER =
  process.env.RESEND_SENDER_EMAIL ?? "Tokolink <noreply@tokolink.app>";
const FONNTE_URL = "https://api.fonnte.com/send";

// ── Shared email template builder ─────────────────────────────────────────────

function buildEmailHtml(params: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
}): string {
  const ctaBlock = params.cta
    ? `<div style="text-align:center;margin:28px 0;">
        <a href="${params.cta.href}" style="display:inline-block;background-color:#FFFFFF;color:#0A0A0A;text-decoration:none;padding:12px 28px;font-size:14px;font-weight:600;border-radius:30px;">
          ${params.cta.label}
        </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.title}</title>
    <style>
      body { font-family: 'Space Grotesk', 'Inter', -apple-system, sans-serif; background-color: #0A0A0A; color: #FFFFFF; margin: 0; padding: 0; }
      .container { max-width: 520px; margin: 40px auto; padding: 40px 32px; background-color: #121212; border: 1px solid #1F1F1F; border-radius: 24px; }
      .logo { font-size: 22px; font-weight: 700; letter-spacing: -0.05em; color: #FFFFFF; margin-bottom: 32px; text-align: center; }
      .logo span { color: #555555; }
      h1 { font-size: 20px; font-weight: 600; color: #FFFFFF; letter-spacing: -0.02em; margin: 0 0 16px; }
      p { font-size: 14px; line-height: 22px; color: #8C8C8C; margin: 0 0 14px; }
      .card { background-color: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 16px; padding: 20px 24px; margin: 20px 0; }
      .card-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
      .card-row:last-child { margin-bottom: 0; }
      .card-label { color: #555555; }
      .card-value { color: #FFFFFF; font-weight: 600; font-family: monospace; }
      .accent { color: #D4FF33; font-weight: 700; }
      .footer { font-size: 11px; color: #444444; margin-top: 40px; border-top: 1px solid #1F1F1F; padding-top: 20px; line-height: 16px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">tokolink<span>/</span></div>
      <h1>${params.title}</h1>
      ${params.bodyHtml}
      ${ctaBlock}
      <div class="footer">Email ini dikirim otomatis oleh sistem Tokolink. Harap tidak membalas email ini.<br>&copy; ${new Date().getFullYear()} Tokolink.</div>
    </div>
  </body>
</html>`;
}

// ── WhatsApp via Fonnte ───────────────────────────────────────────────────────

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!phone) return;
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

// ── 1. Seller: new order paid ─────────────────────────────────────────────────

export async function sendEmailSellerNewOrder(params: {
  sellerEmail: string;
  sellerName: string;
  orderCode: string;
  buyerName: string;
  subtotal: number;
}): Promise<void> {
  if (!params.sellerEmail) return;
  try {
    await resend.emails.send({
      from: SENDER,
      to: params.sellerEmail,
      subject: `Pesanan baru masuk — ${params.orderCode}`,
      html: buildEmailHtml({
        title: "Pesanan baru masuk! 🛍️",
        bodyHtml: `
          <p>Halo <strong style="color:#FFFFFF">${params.sellerName}</strong>,</p>
          <p>Ada pesanan baru dari pembeli. Segera proses dan buat resi pengiriman!</p>
          <div class="card">
            <div class="card-row"><span class="card-label">Kode Pesanan</span><span class="card-value accent">${params.orderCode}</span></div>
            <div class="card-row"><span class="card-label">Nama Pembeli</span><span class="card-value">${params.buyerName}</span></div>
            <div class="card-row"><span class="card-label">Subtotal</span><span class="card-value">Rp${params.subtotal.toLocaleString("id-ID")}</span></div>
          </div>
        `,
        cta: { label: "Lihat Pesanan →", href: `${getAppUrl()}/dashboard/orders` },
      }),
    });
  } catch (err) {
    console.error("[notifications] email seller-new-order failed:", err);
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
    `🛍️ *Pesanan baru masuk!*\n\nKode: *${params.orderCode}*\nDari: ${params.buyerName}\nSubtotal: Rp${params.subtotal.toLocaleString("id-ID")}\n\nBuka dashboard: ${getAppUrl()}/dashboard/orders`
  );
}

// ── 3. Buyer WhatsApp Notifications ───────────────────────────────────────────

export async function notifyBuyerWhatsAppPaid(params: {
  buyerPhone: string;
  buyerName: string;
  orderCode: string;
  storeName: string;
  storeSlug: string;
}): Promise<void> {
  await sendWhatsApp(
    params.buyerPhone,
    `🛍️ *Pembayaran Diterima!*\n\nHalo *${params.buyerName}*, pembayaran untuk pesanan *${params.orderCode}* di toko *${params.storeName}* telah berhasil diterima. Terima kasih banyak telah berbelanja di toko kami! 🙏\n\nCek rincian pesanan: ${getAppUrl()}/${params.storeSlug}/order/${params.orderCode}`
  );
}

export async function notifyBuyerWhatsAppShipped(params: {
  buyerPhone: string;
  buyerName?: string;
  orderCode: string;
  trackingNumber: string;
  courierCompany: string;
  storeName?: string;
  storeSlug: string;
}): Promise<void> {
  const storeText = params.storeName ? ` dari toko *${params.storeName}*` : "";
  const nameGreeting = params.buyerName ? `Halo *${params.buyerName}*, ` : "";
  await sendWhatsApp(
    params.buyerPhone,
    `📦 *Pesananmu Dikirim!*\n\n${nameGreeting}pesanan *${params.orderCode}*${storeText} sedang dalam pengiriman.\n\nKurir: *${params.courierCompany.toUpperCase()}*\nNo. Resi: *${params.trackingNumber}*\n\nCek lacak pengiriman: ${getAppUrl()}/${params.storeSlug}/order/${params.orderCode}`
  );
}

export async function notifyBuyerWhatsAppCompleted(params: {
  buyerPhone: string;
  buyerName: string;
  orderCode: string;
  storeName: string;
  storeSlug: string;
}): Promise<void> {
  await sendWhatsApp(
    params.buyerPhone,
    `✅ *Pesanan Selesai!*\n\nHalo *${params.buyerName}*, pesanan *${params.orderCode}* dari toko *${params.storeName}* telah selesai.\n\nTerima kasih banyak telah berbelanja di *${params.storeName}*! ❤️ Semoga kamu menyukai produknya.\n\nLihat rincian & ulasan: ${getAppUrl()}/${params.storeSlug}/order/${params.orderCode}`
  );
}

export async function notifyBuyerWhatsAppDigitalDelivery(params: {
  buyerPhone: string;
  buyerName: string;
  orderCode: string;
  storeName: string;
  storeSlug: string;
  productName: string;
  digitalDeliverySnapshot: string;
}): Promise<void> {
  await sendWhatsApp(
    params.buyerPhone,
    `⚡ *Pengiriman Produk Digital!*\n\nHalo *${params.buyerName}*, berikut adalah produk digital untuk pesanan *${params.orderCode}* dari toko *${params.storeName}*:\n\n📦 *${params.productName}*\n${params.digitalDeliverySnapshot}\n\nTerima kasih banyak telah berbelanja di *${params.storeName}*! 🙏\n\nCek pesanan: ${getAppUrl()}/${params.storeSlug}/order/${params.orderCode}`
  );
}

// ── 4. Seller: order completed ────────────────────────────────────────────────

export async function sendEmailSellerOrderCompleted(params: {
  sellerEmail: string;
  sellerName: string;
  orderCode: string;
  sellerPayout: number;
  autoCompleted: boolean;
}): Promise<void> {
  if (!params.sellerEmail) return;
  const trigger = params.autoCompleted
    ? "otomatis ditandai selesai (7 hari sejak dikirim tanpa konfirmasi buyer)"
    : "dikonfirmasi diterima oleh pembeli";
  try {
    await resend.emails.send({
      from: SENDER,
      to: params.sellerEmail,
      subject: `Pesanan selesai — ${params.orderCode}`,
      html: buildEmailHtml({
        title: "Pesanan selesai ✅",
        bodyHtml: `
          <p>Halo <strong style="color:#FFFFFF">${params.sellerName}</strong>,</p>
          <p>Pesanan <span class="accent">${params.orderCode}</span> sudah ${trigger}.</p>
          <div class="card">
            <div class="card-row"><span class="card-label">Kode Pesanan</span><span class="card-value accent">${params.orderCode}</span></div>
            <div class="card-row"><span class="card-label">Payout kamu</span><span class="card-value">Rp${params.sellerPayout.toLocaleString("id-ID")}</span></div>
            <div class="card-row"><span class="card-label">Estimasi cair</span><span class="card-value">1×24 jam</span></div>
          </div>
          <p>Dana akan diproses otomatis oleh sistem Tokolink ke rekening yang sudah kamu daftarkan.</p>
        `,
        cta: { label: "Lihat Pendapatan →", href: `${getAppUrl()}/dashboard/earnings` },
      }),
    });
  } catch (err) {
    console.error("[notifications] email seller-order-completed failed:", err);
  }
}

// ── 5. Seller: payout success ─────────────────────────────────────────────────

export async function sendEmailSellerPayoutSuccess(params: {
  sellerEmail: string;
  sellerName: string;
  orderCode: string;
  amount: number;
  bankAccountNumber: string;
}): Promise<void> {
  if (!params.sellerEmail) return;
  try {
    await resend.emails.send({
      from: SENDER,
      to: params.sellerEmail,
      subject: `Dana cair — ${params.orderCode}`,
      html: buildEmailHtml({
        title: "Dana kamu sudah cair! 💰",
        bodyHtml: `
          <p>Halo <strong style="color:#FFFFFF">${params.sellerName}</strong>,</p>
          <p>Dana dari pesanan <span class="accent">${params.orderCode}</span> sudah berhasil dikirim ke rekeningmu.</p>
          <div class="card">
            <div class="card-row"><span class="card-label">Jumlah</span><span class="card-value accent">Rp${params.amount.toLocaleString("id-ID")}</span></div>
            <div class="card-row"><span class="card-label">Rekening tujuan</span><span class="card-value">****${params.bankAccountNumber.slice(-4)}</span></div>
          </div>
          <p>Biasanya masuk dalam beberapa menit hingga 1 jam tergantung bank tujuan.</p>
        `,
        cta: { label: "Lihat Riwayat Pencairan →", href: `${getAppUrl()}/dashboard/earnings` },
      }),
    });
  } catch (err) {
    console.error("[notifications] email seller-payout-success failed:", err);
  }
}

export async function notifySellerWhatsAppPayoutSuccess(params: {
  sellerPhone: string;
  orderCode: string;
  amount: number;
}): Promise<void> {
  await sendWhatsApp(
    params.sellerPhone,
    `💰 *Dana cair!*\n\nPesanan: *${params.orderCode}*\nJumlah: *Rp${params.amount.toLocaleString("id-ID")}*\n\nCek rekeningmu ya! 🎉`
  );
}

// ── 6. Seller + Admin: payout failed ─────────────────────────────────────────

export async function sendEmailSellerPayoutFailed(params: {
  sellerEmail: string;
  sellerName: string;
  orderCode: string;
  amount: number;
}): Promise<void> {
  if (!params.sellerEmail) return;
  try {
    await resend.emails.send({
      from: SENDER,
      to: params.sellerEmail,
      subject: `Payout tertunda — ${params.orderCode}`,
      html: buildEmailHtml({
        title: "Payout sedang diproses ulang",
        bodyHtml: `
          <p>Halo <strong style="color:#FFFFFF">${params.sellerName}</strong>,</p>
          <p>Ada kendala teknis saat mengirim dana <span class="accent">Rp${params.amount.toLocaleString("id-ID")}</span> untuk pesanan <span class="accent">${params.orderCode}</span> ke rekeningmu.</p>
          <p>Dana kamu <strong style="color:#FFFFFF">aman</strong> dan tim kami sedang menindaklanjuti secara otomatis. Pastikan data rekening di pengaturan sudah benar dan aktif.</p>
        `,
        cta: { label: "Cek Pengaturan Rekening →", href: `${getAppUrl()}/dashboard/settings` },
      }),
    });
  } catch (err) {
    console.error("[notifications] email seller-payout-failed failed:", err);
  }
}

export async function alertAdminPayoutFailed(params: {
  orderCode: string;
  tenantId: string;
  amount: number;
  failureReason: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (adminEmail) {
    try {
      await resend.emails.send({
        from: SENDER,
        to: adminEmail,
        subject: `⚠️ Payout gagal — ${params.orderCode}`,
        html: buildEmailHtml({
          title: "⚠️ Payout Gagal — Butuh Tindakan",
          bodyHtml: `
            <p>Payout gagal diproses oleh Iris Facilitator dan butuh tindak lanjut manual.</p>
            <div class="card">
              <div class="card-row"><span class="card-label">Order</span><span class="card-value accent">${params.orderCode}</span></div>
              <div class="card-row"><span class="card-label">Tenant ID</span><span class="card-value">${params.tenantId}</span></div>
              <div class="card-row"><span class="card-label">Jumlah</span><span class="card-value">Rp${params.amount.toLocaleString("id-ID")}</span></div>
              <div class="card-row"><span class="card-label">Alasan</span><span class="card-value" style="color:#FF6B6B">${params.failureReason}</span></div>
            </div>
            <p>Cek tabel Payout di database dan Iris dashboard untuk tindak lanjut.</p>
          `,
          cta: { label: "Buka Iris Dashboard →", href: "https://app.sandbox.midtrans.com/iris" },
        }),
      });
    } catch (err) {
      console.error("[notifications] admin alert email failed:", err);
    }
  }

  const adminPhone = process.env.ADMIN_ALERT_WHATSAPP;
  if (adminPhone) {
    await sendWhatsApp(
      adminPhone,
      `⚠️ *Payout gagal*\n\nOrder: ${params.orderCode}\nJumlah: Rp${params.amount.toLocaleString("id-ID")}\nAlasan: ${params.failureReason}\n\nCek Payout table dan Iris dashboard.`
    );
  }
}
