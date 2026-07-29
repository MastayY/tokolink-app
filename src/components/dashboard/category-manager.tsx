import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Plus, Check, X, Tag } from "lucide-react";
import { useTenant } from "@/lib/store";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/dashboard/delete-confirm-modal";
import { toast } from "sonner";

// ─── Inline Edit Row ─────────────────────────────────────────────────────────
function EditRow({
  category,
  onDone,
}: {
  category: Category;
  onDone: () => void;
}) {
  const renameCategory = useTenant((s) => s.renameCategory);
  const [value, setValue] = useState(category.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === category.name) { onDone(); return; }
    setSaving(true);
    try {
      await renameCategory(category.id, trimmed);
      toast.success("Kategori diperbarui");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memperbarui kategori");
    } finally {
      setSaving(false);
      onDone();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onDone();
        }}
        autoFocus
        maxLength={50}
        className="h-8 text-sm py-1"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex-shrink-0 p-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition disabled:opacity-50"
        aria-label="Simpan"
      >
        <Check size={14} />
      </button>
      <button
        onClick={onDone}
        className="flex-shrink-0 p-1.5 rounded-lg border border-border hover:bg-secondary transition"
        aria-label="Batal"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Category Manager ─────────────────────────────────────────────────────────
export function CategoryManager() {
  const categories = useTenant((s) => s.tenant?.categories ?? []);
  const addCategory = useTenant((s) => s.addCategory);
  const removeCategory = useTenant((s) => s.removeCategory);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmCategory, setConfirmCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await addCategory(trimmed);
      setNewName("");
      toast.success(`Kategori "${trimmed}" ditambahkan`);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menambahkan kategori");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    setDeletingId(cat.id);
    try {
      await removeCategory(cat.id);
      toast.success(`Kategori "${cat.name}" dihapus`);
      setConfirmCategory(null);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menghapus kategori");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-foreground">
          <Tag size={15} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Kategori Produk</h3>
          <p className="text-xs text-muted-foreground">
            {categories.length === 0
              ? "Belum ada kategori"
              : `${categories.length} kategori`}
          </p>
        </div>
      </div>

      {/* Category list */}
      <div className="px-5 py-3 space-y-1.5 min-h-[48px]">
        <AnimatePresence initial={false}>
          {categories.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-3 text-center text-xs text-muted-foreground"
            >
              Tambah kategori untuk mengelompokkan produk di toko.
            </motion.p>
          )}
          {categories.map((cat) => (
            <motion.div
              key={cat.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 group"
            >
              {editingId === cat.id ? (
                <EditRow category={cat} onDone={() => setEditingId(null)} />
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingId(cat.id)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition text-muted-foreground hover:text-foreground"
                      aria-label={`Edit ${cat.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmCategory(cat)}
                      disabled={deletingId === cat.id}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive disabled:opacity-50"
                      aria-label={`Hapus ${cat.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add new category */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="Nama kategori baru…"
            maxLength={50}
            className="h-9 text-sm"
          />
          <Button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="h-9 px-3 shrink-0 gap-1.5"
          >
            <Plus size={15} />
            Tambah
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {confirmCategory && (
          <ConfirmModal
            title="Hapus kategori?"
            itemName={confirmCategory.name}
            loading={deletingId === confirmCategory.id}
            onClose={() => setConfirmCategory(null)}
            onConfirm={() => handleDelete(confirmCategory)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
