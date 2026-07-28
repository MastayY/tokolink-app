import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { createTenant } from "@/server/tenant.functions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { getAppUrl, getAppHost } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Onboarding — Tokolink" }],
    links: [{ rel: "canonical", href: `${getAppUrl()}/onboarding` }],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { isLoading: authLoading, user } = useAuthGuard({ requireTenant: false });
  const setUser = useAuth((s) => s.setUser);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Guard: Redirect if already has a tenant
  useEffect(() => {
    if (!authLoading && user && user.tenant) {
      navigate({ to: "/dashboard" });
    }
  }, [user, authLoading, navigate]);

  const cleanSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanSlug || !name) return;

    setLoading(true);
    setError("");

    try {
      const { getRecaptchaToken } = await import("@/lib/recaptcha");
      const recaptchaToken = await getRecaptchaToken("onboarding");

      const tenant = await createTenant({
        data: {
          slug: cleanSlug,
          name,
          tagline,
          recaptchaToken,
        },
      });

      // Update the user profile in store with the new tenant info
      setUser({
        ...user,
        tenant,
      });

      navigate({ to: "/dashboard" });
    } catch (err: any) {
      const { getErrorMessage } = await import("@/lib/utils");
      setError(getErrorMessage(err) || "Gagal membuat toko. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16 bg-background text-foreground">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Langkah 1 dari 1
        </span>
        <h1 className="font-display mt-3 text-5xl font-medium tracking-tight text-balance">
          Klaim slug toko-mu.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Ini akan jadi URL publik toko kamu. Bisa diubah nanti.
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

        <form onSubmit={submit} className="mt-12 space-y-8">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug-input">URL Toko</Label>
            <div className="flex items-center border-b border-border focus-within:border-foreground transition">
              <span className="font-display text-lg text-muted-foreground pl-1 shrink-0">
                {getAppHost()}/
              </span>
              <Input
                id="slug-input"
                required
                disabled={loading}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="nama-toko-kamu"
                className="font-display flex-1 bg-transparent border-none py-3 text-lg focus:border-none focus:outline-none shadow-none"
              />
            </div>
            {cleanSlug && (
              <p className="mt-2 text-xs text-muted-foreground">
                URL kamu: <span className="text-foreground">{getAppHost()}/{cleanSlug}</span>
              </p>
            )}
          </div>

          <Field label="Nama Toko">
            <Input
              required
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kopi Senja"
            />
          </Field>

          <Field label="Tagline (opsional)">
            <Input
              disabled={loading}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Specialty coffee dari Bandung"
            />
          </Field>

          <Button type="submit" disabled={loading} className="inline-flex items-center gap-2">
            {loading ? "Membuat toko..." : "Lanjut ke dashboard →"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
