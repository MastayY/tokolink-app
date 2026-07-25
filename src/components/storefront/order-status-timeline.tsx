// src/components/storefront/order-status-timeline.tsx
import { motion } from "framer-motion";
import type { OrderStatus } from "@prisma/client";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PAID", label: "Pembayaran diterima" },
  { status: "PROCESSING", label: "Diproses penjual" },
  { status: "SHIPPED", label: "Dikirim" },
  { status: "COMPLETED", label: "Selesai" },
];

const ORDER_INDEX: Record<string, number> = {
  PENDING_PAYMENT: -1,
  PAID: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 2,
  COMPLETED: 3,
  CANCELLED: -2,
  EXPIRED: -2,
};

interface OrderStatusTimelineProps {
  status: string;
  trackingNumber?: string | null;
  courierCompany?: string | null;
}

export function OrderStatusTimeline({
  status,
  trackingNumber,
  courierCompany,
}: OrderStatusTimelineProps) {
  const currentIdx = ORDER_INDEX[status] ?? -1;

  return (
    <div className="space-y-1">
      {STEPS.map((step, idx) => {
        const isDone = currentIdx >= idx;
        const isCurrent = currentIdx === idx;

        return (
          <div key={step.status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isDone ? "hsl(var(--foreground))" : "transparent",
                  borderColor: isDone ? "hsl(var(--foreground))" : "hsl(var(--border))",
                }}
                transition={{ duration: 0.25 }}
                className="h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0"
              >
                {isDone && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="h-2.5 w-2.5 text-background"
                    viewBox="0 0 10 10"
                    fill="none"
                  >
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </motion.svg>
                )}
              </motion.div>
              {idx < STEPS.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 ${isDone ? "bg-foreground" : "bg-border"}`} />
              )}
            </div>
            <div className="pb-4">
              <p className={`text-sm ${isCurrent ? "font-semibold" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                {step.label}
              </p>
              {step.status === "SHIPPED" && isCurrent && trackingNumber && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {courierCompany?.toUpperCase()} · Resi: {trackingNumber}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
