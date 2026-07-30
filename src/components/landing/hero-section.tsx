import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative px-6 pt-40 pb-24 sm:pt-48 sm:pb-32 overflow-hidden">
      {/* Background Grid Pattern with Radial Fade */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)] opacity-40 pointer-events-none -z-10" />

      {/* Glowing Abstract Blurs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.15, 0.95, 1],
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-1/4 -left-1/4 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 0.9, 1.1, 1],
            x: [0, -30, 50, 0],
            y: [0, 40, -10, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/3 -right-1/4 h-[600px] w-[600px] rounded-full bg-muted/30 blur-[150px]"
        />
      </div>

      {/* Abstract Concentric Circles Vector Ornament */}
      <motion.div
        initial={{ opacity: 0, rotate: -10 }}
        animate={{ opacity: 0.15, rotate: 10 }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear",
        }}
        className="absolute right-12 top-24 hidden lg:block text-foreground pointer-events-none -z-10"
      >
        <svg
          width="220"
          height="220"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        >
          <circle cx="50" cy="50" r="45" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="35" />
          <circle cx="50" cy="50" r="25" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="15" />
          <path d="M50 0v100M0 50h100" strokeDasharray="1 1" />
        </svg>
      </motion.div>

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          Made for everyone.
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05 }}
          className="font-display mt-6 text-[clamp(3rem,8vw,7rem)] font-medium leading-[0.95] tracking-tight text-balance"
        >
          Toko online <span className="italic font-light text-foreground/60">kamu,</span>
          <br />
          siap dalam 5 menit.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-8 max-w-xl text-lg text-muted-foreground text-pretty"
        >
          Satu halaman. Semua link, semua produk, satu tombol checkout langsung masuk ke order. Gratis
          & open-source untuk semua UMKM.
        </motion.p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <motion.div whileTap={{ scale: 0.97 }} whileHover="hover" className="inline-block">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition hover:bg-foreground/90"
            >
              Klaim slug kamu
              <motion.span
                variants={{
                  rest: { rotate: 0 },
                  hover: { rotate: 45 },
                }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                className="grid h-6 w-6 place-items-center rounded-full bg-accent text-foreground font-semibold"
              >
                ↗
              </motion.span>
            </Link>
          </motion.div>
          <motion.div whileTap={{ scale: 0.97 }} className="inline-block">
            <Link
              to="/$slug"
              params={{ slug: "tokolink" }}
              className="rounded-full border border-border px-6 py-3.5 text-sm font-medium hover:bg-surface transition inline-block"
            >
              Lihat demo storefront
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
