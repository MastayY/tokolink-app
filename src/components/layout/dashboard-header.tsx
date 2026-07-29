import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { TokolinkLogo } from "@/components/brand/logo";
import type { Tenant } from "@/lib/types";

interface DashboardHeaderProps {
  setIsMobileOpen: (open: boolean) => void;
  tenant: Tenant | null;
}

export function DashboardHeader({ setIsMobileOpen, tenant }: DashboardHeaderProps) {
  return (
    <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-border bg-card sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
        >
          <Menu className="h-6 w-6" />
        </button>
        <TokolinkLogo size={20} showWordmark />
        <span className="font-display text-sm font-semibold text-muted-foreground -ml-1.5">
          {tenant?.slug || ""}
        </span>
      </div>
      {tenant?.slug ? (
        <Link
          to="/$slug"
          params={{ slug: tenant.slug }}
          target="_blank"
          className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-surface transition"
        >
          Toko ↗
        </Link>
      ) : (
        <span className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground opacity-50">
          Toko ↗
        </span>
      )}
    </header>
  );
}
