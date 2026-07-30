import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

type AuthMode = "signin" | "signup" | "otp";

export function useAuthForm() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const user = useAuth((s) => s.user);
  const navigate = useNavigate();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      if (user.tenant) {
        navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/onboarding" });
      }
    }
  }, [user, navigate]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        const { registerUser } = await import("@/server/auth.functions");
        const res = await registerUser({ data: { email, password, turnstileToken } });
        if (res.success) {
          setMode("otp");
          setCooldown(60);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || "Terjadi kesalahan saat melakukan autentikasi");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      const { verifySignUpCode } = await import("@/server/auth.functions");
      const res = await verifySignUpCode({ data: { email, code } });

      if (res.success) {
        // Auto-login using saved credentials
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || "Kode verifikasi salah.");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError("");

    try {
      const { resendSignUpCode } = await import("@/server/auth.functions");
      const res = await resendSignUpCode({ data: { email, turnstileToken } });

      if (res.success) {
        setCooldown(60);
        setCode("");
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || "Gagal mengirim ulang kode.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard",
        },
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      setError(getErrorMessage(err) || "Gagal masuk menggunakan Google");
      setLoading(false);
    }
  };

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    code,
    setCode,
    turnstileToken,
    setTurnstileToken,
    loading,
    error,
    cooldown,
    submitCredentials,
    verifyCode,
    resendCode,
    signInWithGoogle,
  };
}
