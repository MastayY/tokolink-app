import { Resend } from "resend";
import { getAppUrl } from "@/lib/utils";

const resendApiKey = process.env.RESEND_API_KEY || "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const SENDER = process.env.RESEND_SENDER_EMAIL || "Tokolink <onboarding@resend.dev>";

export async function sendVerificationEmail(email: string, code: string) {
  const subject = `Kode Verifikasi Tokolink: ${code}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Space Grotesk', 'Inter', -apple-system, sans-serif;
            background-color: #0A0A0A;
            color: #FFFFFF;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            padding: 40px 32px;
            background-color: #121212;
            border: 1px solid #1F1F1F;
            border-radius: 24px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 32px;
            letter-spacing: -0.05em;
            color: #FFFFFF;
          }
          .logo span {
            color: #555555;
          }
          h1 {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #FFFFFF;
            letter-spacing: -0.02em;
          }
          p {
            font-size: 14px;
            line-height: 22px;
            color: #8C8C8C;
            margin-bottom: 24px;
          }
          .code-box {
            display: inline-block;
            background-color: #1A1A1A;
            border: 1px solid #2A2A2A;
            padding: 18px 36px;
            border-radius: 16px;
            font-family: monospace;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #D4FF33;
            margin-bottom: 28px;
          }
          .footer {
            font-size: 11px;
            color: #444444;
            margin-top: 40px;
            border-top: 1px solid #1F1F1F;
            padding-top: 20px;
            line-height: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">tokolink<span>/</span></div>
          <h1>Verifikasi email kamu</h1>
          <p>Terima kasih telah bergabung di Tokolink! Gunakan kode verifikasi di bawah ini untuk menyelesaikan pendaftaran akun kamu:</p>
          <div class="code-box">${code}</div>
          <p>Kode ini berlaku selama <strong>10 menit</strong>. Harap tidak membagikan kode ini kepada siapapun.</p>
          <div class="footer">
            Email ini dikirim secara otomatis. Jika kamu tidak merasa mendaftar di Tokolink, abaikan email ini.<br>
            &copy; 2026 Tokolink.
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Verifikasi Email Tokolink

Halo,
Terima kasih telah bergabung di Tokolink! Gunakan kode verifikasi di bawah ini untuk menyelesaikan pendaftaran:

KODE VERIFIKASI: ${code}

Kode ini berlaku selama 10 menit. Harap tidak membagikan kode ini kepada siapapun.

Jika Anda tidak mendaftar di Tokolink, silakan abaikan email ini secara aman.

Salam hangat,
Tim Tokolink
  `;

  if (!resend) {
    console.log("==================================================");
    console.log(`[DEV RESEND FALLBACK] Send OTP email to: ${email}`);
    console.log(`[DEV RESEND FALLBACK] Subject: ${subject}`);
    console.log(`[DEV RESEND FALLBACK] Verification Code: ${code}`);
    console.log("==================================================");
    return;
  }

  const { error } = await resend.emails.send({
    from: SENDER,
    to: email,
    subject: subject,
    html: htmlBody,
    text: textBody,
  });

  if (error) {
    throw new Error(`Gagal mengirim kode verifikasi email: ${error.message}`);
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  const subject = "Selamat Datang di Tokolink! 🚀";

  const displayName = name.split("@")[0]; // Use prefix if name is just email

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Space Grotesk', 'Inter', -apple-system, sans-serif;
            background-color: #0A0A0A;
            color: #FFFFFF;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            padding: 40px 32px;
            background-color: #121212;
            border: 1px solid #1F1F1F;
            border-radius: 24px;
            text-align: left;
          }
          .logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 32px;
            letter-spacing: -0.05em;
            color: #FFFFFF;
            text-align: center;
          }
          .logo span {
            color: #555555;
          }
          h1 {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #FFFFFF;
            letter-spacing: -0.02em;
            text-align: center;
          }
          p {
            font-size: 14px;
            line-height: 22px;
            color: #8C8C8C;
            margin-bottom: 16px;
          }
          .highlight {
            color: #D4FF33;
            font-weight: 600;
          }
          .steps {
            background-color: #1A1A1A;
            border: 1px solid #2A2A2A;
            padding: 20px 24px;
            border-radius: 16px;
            margin: 24px 0;
          }
          .step-item {
            margin-bottom: 12px;
            font-size: 13px;
            line-height: 20px;
            color: #CCCCCC;
          }
          .step-number {
            color: #D4FF33;
            font-weight: bold;
            margin-right: 8px;
          }
          .btn-wrapper {
            text-align: center;
            margin: 28px 0;
          }
          .btn {
            display: inline-block;
            background-color: #FFFFFF;
            color: #0A0A0A;
            text-decoration: none;
            padding: 12px 28px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 30px;
            transition: opacity 0.2s;
          }
          .footer {
            font-size: 11px;
            color: #444444;
            margin-top: 40px;
            border-top: 1px solid #1F1F1F;
            padding-top: 20px;
            line-height: 16px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">tokolink<span>/</span></div>
          <h1>Halo, ${displayName}! 👋</h1>
          <p>Selamat bergabung di <span class="highlight">Tokolink</span>! Akun Anda telah berhasil diverifikasi dan siap digunakan.</p>
          <p>Tokolink dirancang untuk memudahkan Anda mengelola katalog produk digital, mengarahkan pesanan langsung ke WhatsApp, dan menautkan link-in-bio kustom dalam satu link premium.</p>
          
          <div class="steps">
            <div class="step-item">
              <span class="step-number">1.</span> Buat Toko & Slug unik Anda di halaman onboarding.
            </div>
            <div class="step-item">
              <span class="step-number">2.</span> Tambahkan produk pertama Anda beserta pilihan variannya.
            </div>
            <div class="step-item">
              <span class="step-number">3.</span> Atur nomor WhatsApp untuk menerima pesanan/checkout langsung.
            </div>
            <div class="step-item">
              <span class="step-number">4.</span> Bagikan link Tokolink Anda di bio Instagram, TikTok, atau WhatsApp!
            </div>
          </div>

          <div class="btn-wrapper">
            <a href="${getAppUrl()}/dashboard" class="btn">Mulai Kelola Toko</a>
          </div>

          <p>Jika Anda memiliki pertanyaan atau butuh bantuan dalam mengatur toko Anda, silakan hubungi tim dukungan kami.</p>
          
          <div class="footer">
            Email ini dikirim ke ${email} sebagai informasi resmi pendaftaran akun Tokolink.<br>
            &copy; 2026 Tokolink.
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Selamat Datang di Tokolink! 🚀

Halo ${displayName},
Selamat bergabung di Tokolink! Akun Anda telah berhasil diverifikasi dan siap digunakan.

Tokolink dirancang untuk memudahkan Anda mengelola katalog produk digital, mengarahkan pesanan langsung ke WhatsApp, dan menautkan link-in-bio kustom dalam satu link premium.

Langkah Selanjutnya:
1. Buat Toko & Slug unik Anda di halaman onboarding.
2. Tambahkan produk pertama Anda beserta pilihan variannya.
3. Atur nomor WhatsApp untuk menerima pesanan/checkout langsung.
4. Bagikan link Tokolink Anda di bio Instagram, TikTok, atau WhatsApp!

Akses dashboard Anda di: ${getAppUrl()}/dashboard

Jika Anda memiliki pertanyaan, jangan ragu untuk membalas email ini.

Salam hangat,
Tim Tokolink
  `;

  if (!resend) {
    console.log("==================================================");
    console.log(`[DEV RESEND FALLBACK] Send welcome email to: ${email}`);
    console.log(`[DEV RESEND FALLBACK] Subject: ${subject}`);
    console.log(`[DEV RESEND FALLBACK] Name: ${displayName}`);
    console.log("==================================================");
    return;
  }

  const { error } = await resend.emails.send({
    from: SENDER,
    to: email,
    subject: subject,
    html: htmlBody,
    text: textBody,
  });

  if (error) {
    console.error(`Gagal mengirim welcome email ke ${email}:`, error.message);
  }
}
