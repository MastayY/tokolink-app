export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-display text-2xl font-medium tracking-tight">
            tokolink<span className="text-foreground/40">/</span>
          </div>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Open-source storefront builder untuk UMKM. Gratis selamanya.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-sm">
          <a
            href="https://github.com/MastayY/tokolink-app"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            GitHub ↗
          </a>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-xs text-muted-foreground">
          <span>© 2026 Tokolink.</span>
          <span>Made with ❤ for Indonesian SMBs</span>
        </div>
      </div>
    </footer>
  );
}
