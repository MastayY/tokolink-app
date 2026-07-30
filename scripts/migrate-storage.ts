// scripts/migrate-storage.ts
// Standalone script to migrate legacy Vercel Blob assets to Cloudflare R2 + WebP compression.
// Updates Tenant.avatar and Product.image in the PostgreSQL database.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { prisma } from "../src/db";

// Validate environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error("Error: Missing required Cloudflare R2 environment variables.");
  console.error("Please check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL in .env");
  process.exit(1);
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function downloadAndCompress(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  Failed to fetch image (HTTP ${res.status}): ${url}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Compress & convert to WebP using sharp
    return await sharp(inputBuffer)
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (err: any) {
    console.error(`  Error processing image from ${url}:`, err.message);
    return null;
  }
}

async function uploadToR2(tenantId: string, webpBuffer: Buffer): Promise<string> {
  const uuid = randomUUID();
  const key = `tenants/${tenantId}/${uuid}.webp`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: webpBuffer,
      ContentType: "image/webp",
      ContentLength: webpBuffer.length,
    }),
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  console.log("Starting Vercel Blob → Cloudflare R2 storage migration...\n");

  // 1. Migrate Tenant avatars
  const tenantsWithBlob = await prisma.tenant.findMany({
    where: {
      avatar: {
        contains: "vercel-storage.com",
      },
    },
    select: { id: true, name: true, avatar: true },
  });

  console.log(`Found ${tenantsWithBlob.length} tenant avatars to migrate.`);

  let migratedTenants = 0;
  for (const tenant of tenantsWithBlob) {
    console.log(`Migrating avatar for Tenant "${tenant.name}" (${tenant.id})...`);
    const webpBuffer = await downloadAndCompress(tenant.avatar);
    if (!webpBuffer) continue;

    const r2Url = await uploadToR2(tenant.id, webpBuffer);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { avatar: r2Url },
    });
    console.log(`  Done -> ${r2Url}`);
    migratedTenants++;
  }

  // 2. Migrate Product images
  const productsWithBlob = await prisma.product.findMany({
    where: {
      image: {
        contains: "vercel-storage.com",
      },
    },
    select: { id: true, name: true, image: true, tenantId: true },
  });

  console.log(`\nFound ${productsWithBlob.length} product images to migrate.`);

  let migratedProducts = 0;
  for (const product of productsWithBlob) {
    console.log(`Migrating image for Product "${product.name}" (${product.id})...`);
    const webpBuffer = await downloadAndCompress(product.image);
    if (!webpBuffer) continue;

    const r2Url = await uploadToR2(product.tenantId, webpBuffer);
    await prisma.product.update({
      where: { id: product.id },
      data: { image: r2Url },
    });
    console.log(`  Done -> ${r2Url}`);
    migratedProducts++;
  }

  console.log("\nStorage migration completed!");
  console.log(`  • Tenants updated: ${migratedTenants}/${tenantsWithBlob.length}`);
  console.log(`  • Products updated: ${migratedProducts}/${productsWithBlob.length}`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
