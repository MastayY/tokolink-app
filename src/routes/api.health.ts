// src/routes/api.health.ts
// Public health-check endpoint. Checks DB reachability and required env
// presence WITHOUT exposing secret values. Safe to expose publicly.
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";

const BASE_REQUIRED_ENV_KEYS = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MIDTRANS_SERVER_KEY",
  "RESEND_API_KEY",
  "BITESHIP_API_KEY",
] as const;


export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const checks: Record<string, string> = {};

        // Check DB reachability
        try {
          await prisma.$queryRaw`SELECT 1`;
          checks.database = "ok";
        } catch (err: any) {
          checks.database = `error: ${err?.message ?? "unknown"}`;
        }

        // Check base env presence
        const missingKeys = BASE_REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

        // Check Redis config (either self-hosted REDIS_URL or Upstash REST pair)
        const hasSelfHostedRedis = Boolean(process.env.REDIS_URL);
        const hasUpstashRedis = Boolean(
          process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
        );

        if (!hasSelfHostedRedis && !hasUpstashRedis) {
          missingKeys.push("REDIS_URL (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)" as any);
        }

        checks.env = missingKeys.length === 0
          ? "ok"
          : `missing: ${missingKeys.join(", ")}`;

        const allOk = Object.values(checks).every((v) => v === "ok");

        return Response.json(
          {
            status: allOk ? "ok" : "degraded",
            timestamp: new Date().toISOString(),
            checks,
          },
          { status: allOk ? 200 : 503 },
        );
      },
    },
  },
});
