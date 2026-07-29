import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "../db";
import { getAppUrl } from "@/lib/utils";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let tenants: Array<{ slug: string; updatedAt: Date }> = [];
        try {
          tenants = await prisma.tenant.findMany({
            select: {
              slug: true,
              updatedAt: true,
            },
          });
        } catch (err) {
          console.error("Failed to fetch tenants for sitemap:", err);
        }

        const appUrl = getAppUrl();
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${appUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${appUrl}/auth</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  ${tenants
    .map(
      (tenant) => `
  <url>
    <loc>${appUrl}/${tenant.slug}</loc>
    <lastmod>${tenant.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join("")}
</urlset>`;

        return new Response(sitemap, {
          headers: {
            "Content-Type": "application/xml",
          },
        });
      },
    },
  },
});
