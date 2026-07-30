import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, AlertCircle, Loader2 } from "lucide-react";
import { validateImage, compressToWebP } from "@/lib/image-utils";
import { uploadImage } from "@/server/upload.functions";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className = "" }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError("");
    setLoading(true);
    setStatus("Memvalidasi gambar...");

    try {
      // 1. Validate
      const validation = await validateImage(file);
      if (!validation.valid) {
        throw new Error(validation.error || "Validasi gagal");
      }

      // 2. Compress to WebP
      setStatus("Mengompresi gambar ke WebP (80%)...");
      const webpBlob = await compressToWebP(file, 0.8);

      // 3. Convert to Base64 for transfer
      setStatus("Menyiapkan file upload...");
      const base64 = await blobToBase64(webpBlob);

      // 4. Upload to Server
      setStatus("Mengunggah gambar ke CDN...");
      const result = await uploadImage({
        data: {
          name: file.name.endsWith(".webp") ? file.name : `${file.name.split(".")[0]}.webp`,
          base64,
        },
      });

      // 5. Done
      onChange(result.url);
      setStatus("");
    } catch (err: any) {
      console.error(err);
      const { getErrorMessage } = await import("@/lib/utils");
      setError(getErrorMessage(err) || "Gagal mengunggah gambar");
    } finally {
      setLoading(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Gagal mengonversi file"));
      reader.readAsDataURL(blob);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const onButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading) {
      inputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-4 w-full ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        onClick={(e) => e.stopPropagation()}
        className="hidden"
        disabled={loading}
      />

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative flex flex-col items-center justify-center min-h-[160px] border-2 border-dashed rounded-3xl p-6 transition duration-200 cursor-pointer text-center select-none overflow-hidden group ${
          dragActive
            ? "border-accent bg-accent/5"
            : "border-border hover:border-foreground/40 hover:bg-muted/10"
        } ${loading ? "pointer-events-none opacity-80" : ""}`}
      >
        {value ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <img
              src={value}
              alt="Uploaded Preview"
              className="h-20 w-20 object-cover rounded-2xl border border-border shadow-sm group-hover:scale-[1.02] transition duration-200"
            />
            {!loading && (
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition duration-200">
                Klik atau drag file untuk mengganti gambar
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-muted/50 rounded-2xl border border-border group-hover:scale-110 transition duration-200">
              <UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition duration-200" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Drag & drop gambar di sini</p>
              <p className="text-xs text-muted-foreground">JPEG, PNG, WebP atau GIF up to 5MB</p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
            <Loader2 className="h-6 w-6 text-accent animate-spin" />
            <p className="mt-2 text-xs font-semibold tracking-tight">{status}</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs font-medium px-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
