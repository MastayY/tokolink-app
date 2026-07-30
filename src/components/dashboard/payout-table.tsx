// src/components/dashboard/payout-table.tsx
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatIDR, getErrorMessage } from "@/lib/utils";
import type { Payout, Order } from "@prisma/client";

type PayoutWithOrder = Payout & { order: Pick<Order, "orderCode" | "buyerName" | "completedAt"> };

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  SCHEDULED: { label: "Dijadwalkan", variant: "secondary" },
  PROCESSING: { label: "Diproses", variant: "default" },
  PAID: { label: "Dibayar", variant: "default" },
  FAILED: { label: "Gagal", variant: "destructive" },
};

interface PayoutTableProps {
  payouts: PayoutWithOrder[];
}

export function PayoutTable({ payouts }: PayoutTableProps) {
  if (payouts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Belum ada riwayat pendapatan.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
      {payouts.map((payout, idx) => {
        const { label, variant } = STATUS_MAP[payout.status] ?? STATUS_MAP.SCHEDULED;
        return (
          <motion.div
            key={payout.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="flex items-center justify-between px-4 py-4 bg-card"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{payout.order.orderCode}</span>
                <Badge variant={variant}>{label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {payout.order.buyerName} ·{" "}
                {payout.scheduledAt
                  ? `Jadwal: ${new Date(payout.scheduledAt).toLocaleDateString("id-ID")}`
                  : ""}
              </p>
              {payout.status === "PAID" && payout.paidAt && (
                <p className="text-xs text-muted-foreground">
                  Dibayar: {new Date(payout.paidAt).toLocaleDateString("id-ID")}
                </p>
              )}
              {payout.failureReason && (
                <p className="text-xs text-destructive">
                  {getErrorMessage(payout.failureReason, "Gagal memproses transfer")}
                </p>
              )}
            </div>
            <p className="font-semibold text-sm">{formatIDR(payout.amount)}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
