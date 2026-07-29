import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ConfirmModalProps {
  title?: string;
  description?: React.ReactNode;
  itemName?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmModal({
  title = "Konfirmasi Hapus",
  description,
  itemName,
  onClose,
  onConfirm,
  confirmLabel = "Hapus",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={true} onClose={onClose}>
      <h3 className="font-display text-xl font-medium text-foreground">{title}</h3>
      <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
        {description ?? (
          <p>
            Apakah Anda yakin ingin menghapus{" "}
            {itemName && <strong className="text-foreground">{itemName}</strong>}? Tindakan ini tidak dapat dibatalkan.
          </p>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2 text-xs">
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          Batal
        </Button>
        <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading}>
          {loading ? "Menghapus..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function DeleteConfirmModal({
  product,
  onClose,
  onConfirm,
}: {
  product: { name: string };
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmModal
      title="Hapus produk?"
      itemName={product.name}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
