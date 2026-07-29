import { createFileRoute, Outlet, useLocation, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, useTenant } from "@/lib/store";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getMyTenant } from "@/server/tenant.functions";
import { Spinner } from "@/components/ui/spinner";
import { getAppUrl } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    try {
      const tenant = await getMyTenant({});
      return { tenant };
    } catch {
      return { tenant: null };
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Tokolink" },
      { property: "og:title", content: "Dashboard — Tokolink" },
      { property: "og:description", content: "Kelola toko online UMKM Anda." },
      { property: "og:image", content: `${getAppUrl()}/og-auth.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${getAppUrl()}/og-auth.png` },
    ],
    links: [{ rel: "canonical", href: `${getAppUrl()}/dashboard` }],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { tenant: loadedTenant } = Route.useLoaderData();
  const { isLoading: authLoading, user } = useAuthGuard({ requireTenant: true });
  const signOut = useAuth((s) => s.signOut);
  const tenant = useTenant((s) => s.tenant);
  const setTenant = useTenant((s) => s.setTenant);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect route transition loading state
  const isNavigating = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading,
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync loader data to Zustand store & fetch client-side if loader missed token
  useEffect(() => {
    if (loadedTenant) {
      setTenant(loadedTenant as any);
    } else if (user && !useTenant.getState().tenant) {
      getMyTenant({})
        .then((t) => {
          if (t) setTenant(t as any);
        })
        .catch((err) => console.error("Failed to fetch tenant client-side:", err));
    }
  }, [loadedTenant, user, setTenant]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground relative">
      {/* Top Animated Progress Bar on Route Transition */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 h-1 bg-lime origin-left"
          />
        )}
      </AnimatePresence>

      {/* 1. Desktop Sticky Sidebar (Hidden on mobile) */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-card text-card-foreground shrink-0 overflow-hidden"
      >
        <DashboardSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobile={false}
          setIsMobileOpen={setIsMobileOpen}
          tenant={tenant}
          pathname={location.pathname}
          signOut={signOut}
          navigate={navigate}
        />
      </motion.aside>

      {/* 2. Mobile Drawer Sidebar (Slide-in, hidden on desktop) */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
            />

            {/* Mobile Sidebar Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col h-screen w-64 border-r border-border bg-card text-card-foreground md:hidden shadow-2xl"
            >
              <DashboardSidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobile={true}
                setIsMobileOpen={setIsMobileOpen}
                tenant={tenant}
                pathname={location.pathname}
                signOut={signOut}
                navigate={navigate}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 3. Main Dashboard Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader setIsMobileOpen={setIsMobileOpen} tenant={tenant} />

        {/* Dashboard Pages Main Section with Loading Overlay */}
        <main className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto relative">
          <AnimatePresence>
            {isNavigating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-[2px]"
              >
                <Spinner size="lg" />
              </motion.div>
            )}
          </AnimatePresence>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
