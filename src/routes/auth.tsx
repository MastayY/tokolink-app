import { useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useAuthForm } from "@/hooks/use-auth-form";
import { Turnstile } from "@marsidev/react-turnstile";
import { TokolinkLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppHost, getAppUrl } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — Tokolink" },
      { property: "og:title", content: "Masuk — Tokolink" },
      {
        property: "og:description",
        content: "Masuk ke Tokolink untuk mengelola toko online UMKM Anda.",
      },
      { property: "og:image", content: `${getAppUrl()}/og-auth.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${getAppUrl()}/og-auth.png` },
    ],
    links: [{ rel: "canonical", href: `${getAppUrl()}/auth` }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    code,
    setCode,
    loading,
    error,
    cooldown,
    submitCredentials,
    verifyCode,
    resendCode,
    signInWithGoogle,
    setTurnstileToken,
  } = useAuthForm();

  const turnstileRef = useRef<any>(null);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-background text-foreground">
      <div className="hidden flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <Link to="/" aria-label="Tokolink — Kembali ke beranda" className="flex items-center">
          <TokolinkLogo size={28} showWordmark />
        </Link>
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="font-display text-5xl font-medium tracking-tight text-balance text-white"
          >
            "Bikin toko itu <em className="font-light text-accent">harusnya</em> semudah upload foto
            IG."
          </motion.h2>
          <p className="mt-6 text-sm text-background/60">— Manifesto Tokolink</p>
        </div>
        <div className="text-xs text-background/40">{getAppHost()}</div>
      </div>

      <div className="flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <Link
            to="/"
            aria-label="Tokolink — Kembali ke beranda"
            className="mb-12 inline-block lg:hidden"
          >
            <TokolinkLogo size={28} showWordmark />
          </Link>

          <h1 className="font-display text-4xl font-medium tracking-tight">
            {mode === "otp"
              ? "Verifikasi email."
              : mode === "signup"
                ? "Bikin akun."
                : "Selamat datang."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "otp"
              ? "Masukkan 6 digit kode yang dikirim ke email kamu."
              : mode === "signup"
                ? "30 detik. Tanpa kartu kredit."
                : "Masuk untuk lanjutkan."}
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20"
            >
              {error}
            </motion.div>
          )}

          {mode === "otp" ? (
            <form onSubmit={verifyCode} className="mt-8 space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code-input">Kode Verifikasi</Label>
                <Input
                  id="code-input"
                  type="text"
                  maxLength={6}
                  required
                  disabled={loading}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="123456"
                  className="text-center font-mono tracking-widest text-lg"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Kami telah mengirimkan kode verifikasi 6 digit ke{" "}
                  <span className="text-foreground">{email}</span>.
                </p>
              </div>

              <Button type="submit" disabled={loading || code.length !== 6} className="mt-8 w-full">
                {loading ? "Memverifikasi..." : "Verifikasi Email"} →
              </Button>

              <div className="flex justify-between items-center mt-6">
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-4 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={loading || cooldown > 0}
                  className="text-xs font-medium text-foreground hover:opacity-85 disabled:opacity-40 transition underline underline-offset-4 cursor-pointer"
                >
                  {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : "Kirim ulang kode"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={submitCredentials} className="mt-8 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email-input">Email</Label>
                  <Input
                    id="email-input"
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kamu@umkm.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password-input">Password</Label>
                  <Input
                    id="password-input"
                    type="password"
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                {(mode === "signup" || mode === "signin") && (
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ""}
                    onSuccess={setTurnstileToken}
                    onError={() => setTurnstileToken("")}
                    onExpire={() => setTurnstileToken("")}
                    options={{
                      size: "invisible",
                      action: mode === "signup" ? "signup" : "login",
                    }}
                  />
                )}

                <Button type="submit" disabled={loading} className="mt-8 w-full">
                  {loading ? "Memproses..." : mode === "signup" ? "Bikin akun" : "Masuk"} →
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">atau</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Masuk dengan Google
              </Button>

              <p className="mt-6 text-sm text-muted-foreground">
                {mode === "signup" ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
                <button
                  onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                  className="text-foreground underline underline-offset-4 cursor-pointer"
                >
                  {mode === "signup" ? "Masuk" : "Daftar"}
                </button>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
