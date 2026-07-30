interface TokolinkLogoProps {
  /** Ukuran logogram dalam px. Default 32 */
  size?: number;
  /** Tampilkan teks wordmark di samping logo. Default false (logogram only) */
  showWordmark?: boolean;
  className?: string;
}

export function TokolinkLogo({
  size = 32,
  showWordmark = false,
  className = "",
}: TokolinkLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Logogram: cross-shape */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Horizontal bar: lime accent */}
        <rect x="48" y="35" width="165" height="55" rx="24" fill="var(--lime)" />
        {/* Vertical bar: foreground (adapts dark/light) */}
        <rect x="104" y="65" width="55" height="140" rx="24" fill="var(--foreground)" />
      </svg>
      {showWordmark && (
        <span className="font-display font-semibold tracking-tight leading-none text-foreground text-lg">
          tokolink
          <span className="text-foreground/30">/</span>
        </span>
      )}
    </span>
  );
}
