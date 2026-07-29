// src/components/dashboard/print-label-dropdown.tsx
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LABEL_SIZES, type LabelSizeKey } from "@/lib/label-sizes";
import { Printer, ChevronDown } from "lucide-react";

interface PrintLabelDropdownProps {
  orderId: string;
}

export function PrintLabelDropdown({ orderId }: PrintLabelDropdownProps) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const toggleOpen = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Dropdown menu is ~140px tall; open upwards if space below is limited (< 160px)
      setDropUp(spaceBelow < 160);
    }
    setOpen((v) => !v);
  };

  const handleDownload = (size: LabelSizeKey) => {
    // Direct navigation — browser handles "attachment" Content-Disposition as file download
    window.location.href = `/api/dashboard/orders/${orderId}/label?size=${size}`;
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleOpen}
        className="flex items-center gap-1.5"
      >
        <Printer className="h-3.5 w-3.5" />
        <span>Label</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {open && (
        <div
          className={`absolute right-0 z-50 w-48 rounded-xl border border-border bg-card shadow-xl overflow-hidden ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {Object.values(LABEL_SIZES).map((s) => (
            <button
              key={s.key}
              onClick={() => handleDownload(s.key as LabelSizeKey)}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
