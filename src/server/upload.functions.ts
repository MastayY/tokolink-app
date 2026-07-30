import { createServerFn } from "@tanstack/react-start";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { authMiddleware } from "./auth-middleware";
import { z } from "zod";
import { randomUUID } from "crypto";

// ── Magic-byte image validation ───────────────────────────────────────────────
// Validates the original upload BEFORE conversion.
// sharp also validates internally, but defense-in-depth matters here.

export function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WEBP: RIFF....WEBP
  if (buffer.length >= 12) {
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    if (isRiff && isWebp) return true;
  }
  return false;
}

// ── R2 S3 client ──────────────────────────────────────────────────────────────

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_INPUT_BYTES = 5 * 1024 * 1024;  // 5 MB input limit (pre-conversion)
const WEBP_QUALITY = 82;                  // 82 is good balance: sharp default is 80
const MAX_DIMENSION = 2000;               // px — clamp oversized images

// ── uploadImage server function ────────────────────────────────────────────────

export const uploadImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().min(1),
      base64: z.string().min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    // 1. Fail loud if authMiddleware didn't populate context.tenant.
    //    This route is behind authMiddleware — tenant should always be present.
    //    A missing tenant here means a middleware bug, not a user error.
    if (!context.tenant?.id) {
      throw new Error(
        "[uploadImage] context.tenant is missing — authMiddleware did not populate it. This is a server bug.",
      );
    }
    const tenantId = context.tenant.id;

    // 2. Decode base64
    const base64Data = data.base64.split(",")[1] || data.base64;
    const inputBuffer = Buffer.from(base64Data, "base64");

    // 3. Magic-bytes validation on the raw upload
    if (!isValidImageBuffer(inputBuffer)) {
      throw new Error(
        "Format berkas tidak didukung. Hanya gambar (PNG, JPG, WEBP, GIF) yang diperbolehkan.",
      );
    }

    // 4. Input size limit (5 MB pre-conversion)
    if (inputBuffer.length > MAX_INPUT_BYTES) {
      throw new Error("Ukuran gambar melebihi batas 5MB");
    }

    // 5. Convert to WebP with compression and dimension cap.
    let webpBuffer: Buffer;
    try {
      webpBuffer = await sharp(inputBuffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (err) {
      throw new Error(`Gagal memproses gambar: ${(err as Error).message}`);
    }

    // 6. Build unpredictable object key using randomUUID()
    const uuid = randomUUID();
    const ext = ".webp";
    const key = `tenants/${tenantId}/${uuid}${ext}`;

    // 7. Upload to R2
    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: webpBuffer,
        ContentType: "image/webp",
        ContentLength: webpBuffer.length,
      }),
    );

    // 8. Construct public URL from env var + key
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    return { url: `${publicBase}/${key}` };
  });
