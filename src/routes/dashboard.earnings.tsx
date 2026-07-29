// src/routes/dashboard.earnings.tsx
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { getMyEarnings } from "@/server/order.functions";
import { EarningsSummaryCard } from "@/components/dashboard/earnings-summary-card";
import { PayoutTable } from "@/components/dashboard/payout-table";

export const Route = createFileRoute("/dashboard/earnings")({
  loader: async () => {
    return getMyEarnings({});
  },
  head: () => ({
    meta: [{ title: "Pendapatan — Dashboard Tokolink" }],
  }),
  component: EarningsPage,
});

function EarningsPage() {
  const { payouts, summary } = Route.useLoaderData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-display font-semibold">Pendapatan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dana kamu otomatis ditransfer setelah pesanan selesai.
        </p>
      </div>

      <EarningsSummaryCard
        pendingTotal={summary.pendingTotal}
        paidThisMonth={summary.paidThisMonth}
      />

      <div className="space-y-3">
        <h2 className="font-semibold text-base">Riwayat Payout</h2>
        <PayoutTable payouts={payouts as any} />
      </div>
    </motion.div>
  );
}
