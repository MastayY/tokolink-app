import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LinkFormProps {
  onSave: (data: { label: string; url: string }) => Promise<void> | void;
}

export function LinkForm({ onSave }: LinkFormProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !url) return;
    setSubmitting(true);
    try {
      await onSave({ label, url });
      setLabel("");
      setUrl("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_2fr_auto] items-center"
    >
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (Instagram)"
        disabled={submitting}
        required
      />
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        disabled={submitting}
        required
        type="url"
      />
      <Button type="submit" size="md" loading={submitting} className="rounded-lg py-3">
        + Tambah
      </Button>
    </form>
  );
}
