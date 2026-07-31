import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/store";
import { syncSession } from "../server/auth.functions";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export function useSession() {
  const { setUser, setLoading } = useAuth();

  useEffect(() => {
    async function handleSession(session: Session | null, isBackground = false) {
      if (session) {
        // Set the session cookie for TanStack Start Server Functions
        // session.expires_in is in seconds, max-age expects seconds
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`;

        try {
          // Only show full-screen loading spinner on initial load when user is not loaded yet
          if (!isBackground && !useAuth.getState().user) {
            setLoading(true);
          }
          const dbUser = await syncSession({});
          setUser(dbUser);
        } catch (err) {
          console.error("Failed to sync session with Prisma:", err);
          if (!useAuth.getState().user) {
            setUser(null);
          }
        } finally {
          setLoading(false);
        }
      } else {
        // Clear session cookie
        document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure`;
        setUser(null);
        setLoading(false);
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data }: any) => {
      handleSession(data.session, false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // Background token refresh (e.g. on window focus) — update cookie silently without unmounting UI
        if (event === "TOKEN_REFRESHED" && session) {
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`;
          return;
        }
        const isAlreadyLoggedIn = !!useAuth.getState().user;
        handleSession(session, isAlreadyLoggedIn);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);
}
