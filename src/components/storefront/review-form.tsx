// src/components/storefront/review-form.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ReviewFormProps {
  orderId: string;
  orderCode: string;
  buyerPhone: string;
  onSubmitted: () => void;
}

export function ReviewForm({ orderId, orderCode, buyerPhone, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { toast.error("Pilih rating dulu"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, orderCode, buyerPhone, rating, comment }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Ulasan terkirim. Terima kasih!");
      onSubmitted();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengirim ulasan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      onSubmit={handleSubmit}
      className="space-y-4 border border-border rounded-xl p-4"
    >
      <h3 className="font-semibold text-sm">Beri Ulasan</h3>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-2xl transition-transform active:scale-90 ${star <= rating ? "text-yellow-400" : "text-muted-foreground/30"}`}
          >
            ★
          </button>
        ))}
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Ceritakan pengalamanmu (opsional)"
        rows={3}
      />

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Mengirim..." : "Kirim Ulasan"}
      </Button>
    </motion.form>
  );
}
