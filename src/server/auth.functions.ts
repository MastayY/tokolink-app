import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { supabaseAdmin } from "../lib/supabase.server";
import { verifyTurnstile } from "./turnstile";
import { sendVerificationEmail, sendWelcomeEmail } from "./email";
import crypto from "crypto";
import { z } from "zod";

function parseCookie(cookieString: string, name: string): string | null {
  const match = cookieString.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

// Check active session and return User profile + Tenant if exists
export const getSessionUser = createServerFn({ method: "GET" }).handler(
  async ({ request }: any) => {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const token = parseCookie(cookieHeader, "sb-access-token");
    if (!token) return null;

    try {
      const {
        data: { user: supaUser },
        error,
      } = await supabaseAdmin.auth.getUser(token);
      if (error || !supaUser) return null;

      const user = await prisma.user.findUnique({
        where: { supabaseId: supaUser.id },
        include: { tenant: true },
      });
      return user;
    } catch (e) {
      console.error("Error fetching session user:", e);
      return null;
    }
  },
);

// Synchronize Supabase user with local Prisma database
export const syncSession = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        name: z.string().optional(),
        avatarUrl: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data, request }: any) => {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const token = parseCookie(cookieHeader, "sb-access-token");
    if (!token) {
      throw new Error("Unauthorized: No session token");
    }

    const {
      data: { user: supaUser },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !supaUser) {
      throw new Error("Unauthorized: Invalid session token");
    }

    const name =
      data?.name || supaUser.user_metadata?.name || supaUser.user_metadata?.full_name || null;
    const avatarUrl = data?.avatarUrl || supaUser.user_metadata?.avatar_url || null;
    const provider = supaUser.app_metadata.provider || "email";

    // If email provider, double-check that they are verified
    if (provider === "email" && !supaUser.email_confirmed_at) {
      throw new Error("Email belum diverifikasi.");
    }

    const user = await prisma.user.upsert({
      where: { supabaseId: supaUser.id },
      create: {
        supabaseId: supaUser.id,
        email: supaUser.email!,
        name,
        avatarUrl,
        provider,
        emailVerified: provider !== "email" ? new Date() : null, // verified if OAuth, unverified if email (will be set during OTP verification)
      },
      update: {
        email: supaUser.email!,
        name: name || undefined,
        avatarUrl: avatarUrl || undefined,
        provider,
        emailVerified: provider !== "email" ? new Date() : undefined, // Set verified for Google OAuth logins if not already done
      },
      include: {
        tenant: true,
      },
    });

    return user;
  });

// Schema validations for registration and verification
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  turnstileToken: z.string().optional(),
});

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const resendSchema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().optional(),
});

// Helper to generate verification OTP
async function generateAndSendOTP(email: string) {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  await prisma.verificationCode.upsert({
    where: { email },
    create: {
      email,
      code,
      expiresAt,
      attempts: 0,
    },
    update: {
      code,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    },
  });

  await sendVerificationEmail(email, code);
}

// 1. Server function to register unconfirmed user
export const registerUser = createServerFn({ method: "POST" })
  .validator(registerSchema)
  .handler(async ({ data }) => {
    const { email, password, turnstileToken } = data;

    // Verify Turnstile
    const isHuman = await verifyTurnstile(turnstileToken ?? "");
    if (!isHuman) {
      throw new Error("Verifikasi bot gagal (Turnstile)");
    }

    // Check if user exists in local database
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new Error("Email sudah terdaftar. Silakan masuk.");
      }

      // Unverified user: update their password in Supabase and resend code
      await supabaseAdmin.auth.admin.updateUserById(existingUser.supabaseId, {
        password,
      });

      await generateAndSendOTP(email);
      return { success: true, message: "Kode verifikasi telah dikirim ulang." };
    }

    // User does not exist at all: create unconfirmed user in Supabase Auth
    try {
      const { data: supaUser, error: supaError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
      });

      if (supaError) {
        throw new Error(supaError.message);
      }

      if (!supaUser || !supaUser.user) {
        throw new Error("Gagal membuat akun.");
      }

      // Create unverified user in Prisma DB
      await prisma.user.create({
        data: {
          email,
          supabaseId: supaUser.user.id,
          provider: "email",
          emailVerified: null,
        },
      });

      await generateAndSendOTP(email);
      return { success: true, message: "Kode verifikasi telah dikirim." };
    } catch (err: any) {
      throw new Error(err.message || "Gagal melakukan registrasi.");
    }
  });

// 2. Server function to verify 6-digit OTP code
export const verifySignUpCode = createServerFn({ method: "POST" })
  .validator(verifyCodeSchema)
  .handler(async ({ data }) => {
    const { email, code } = data;

    const record = await prisma.verificationCode.findUnique({
      where: { email },
    });

    if (!record) {
      throw new Error("Kode verifikasi tidak ditemukan. Silakan kirim ulang.");
    }

    if (new Date() > record.expiresAt) {
      throw new Error("Kode verifikasi telah kedaluwarsa. Silakan kirim ulang.");
    }

    // Brute-force protection: check and increment attempts
    const newAttempts = record.attempts + 1;
    if (newAttempts > 5) {
      await prisma.verificationCode.delete({ where: { email } });
      throw new Error("Terlalu banyak percobaan salah. Silakan minta kode baru.");
    }

    await prisma.verificationCode.update({
      where: { email },
      data: { attempts: newAttempts },
    });

    if (record.code !== code) {
      throw new Error(`Kode verifikasi salah. Sisa percobaan: ${5 - newAttempts}`);
    }

    // Successful verification: fetch user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User tidak ditemukan.");
    }

    // Update Supabase confirm status
    const { error: supaError } = await supabaseAdmin.auth.admin.updateUserById(user.supabaseId, {
      email_confirm: true,
    });

    if (supaError) {
      throw new Error(supaError.message);
    }

    // Update email verified status in local DB
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Cleanup OTP code
    await prisma.verificationCode.delete({
      where: { email },
    });

    // Send welcome email asynchronously to avoid blocking the client response
    sendWelcomeEmail(email, user.name || email).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    return { success: true, message: "Email berhasil diverifikasi." };
  });

// 3. Server function to resend OTP code with rate limiting
export const resendSignUpCode = createServerFn({ method: "POST" })
  .validator(resendSchema)
  .handler(async ({ data }) => {
    const { email, turnstileToken } = data;

    const isHuman = await verifyTurnstile(turnstileToken ?? "");
    if (!isHuman) {
      throw new Error("Verifikasi bot gagal (Turnstile)");
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Email tidak terdaftar.");
    }

    if (user.emailVerified) {
      throw new Error("Email sudah terverifikasi.");
    }

    // Rate limit check: 60 seconds cooldown
    const existing = await prisma.verificationCode.findUnique({
      where: { email },
    });

    if (existing) {
      const secondsElapsed = (Date.now() - new Date(existing.createdAt).getTime()) / 1000;
      if (secondsElapsed < 60) {
        throw new Error(`Tunggu ${Math.ceil(60 - secondsElapsed)} detik sebelum mengirim ulang.`);
      }
    }

    await generateAndSendOTP(email);
    return { success: true, message: "Kode verifikasi baru dikirim." };
  });
