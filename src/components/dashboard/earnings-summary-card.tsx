// src/components/dashboard/earnings-summary-card.tsx
import { motion } from "framer-motion";
import { formatIDR } from "@/lib/utils";

interface EarningsSummaryCardProps {
  pendingTotal: number;
  paidThisMonth: number;
}

export function EarningsSummaryCard({ pendingTotal, paidThisMonth }: EarningsSummaryCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[
        {
          label: "Menunggu Disbursement",
          value: pendingTotal,
          description: "Akan ditransfer setelah pesanan selesai + settlement",
        },
        {
          label: "Dibayar Bulan Ini",
          value: paidThisMonth,
          description: "Total payout yang sudah diterima bulan ini",
        },
      ].map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.25, ease: [0.2, 0, 0, 1] }}
          className="rounded-xl border border-border bg-card p-6 space-y-1"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {card.label}
          </p>
          <p className="text-2xl font-display font-bold">{formatIDR(card.value)}</p>
          <p className="text-xs text-muted-foreground">{card.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
