// src/routes/api.shipping.areas.ts
import { createFileRoute } from "@tanstack/react-router";
import { searchBiteshipArea } from "@/lib/biteship";

export const Route = createFileRoute("/api/shipping/areas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q")?.trim() ?? "";
        if (q.length < 2) {
          return Response.json({ areas: [] });
        }
        try {
          const areas = await searchBiteshipArea(q);
          return Response.json({ areas });
        } catch (err) {
          console.error("[api/shipping/areas]", err);
          return Response.json({ error: "Gagal mencari area" }, { status: 502 });
        }
      },
    },
  },
});
