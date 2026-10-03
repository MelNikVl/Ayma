import { cn } from "@/lib/cn";

const gradients = [
  ["#0066FF", "#00C2FF"],
  ["#7C3AED", "#C084FC"],
  ["#DB2777", "#F472B6"],
  ["#EA580C", "#FBBF24"],
  ["#059669", "#34D399"],
  ["#0F172A", "#475569"],
];

export function StartupLogo({
  name,
  logoUrl,
  size = 56,
  className,
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
  className?: string;
}) {
  const radius = Math.round(size * 0.22);
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Логотип ${name}`}
        width={size}
        height={size}
        loading="lazy"
        className={cn("shrink-0 border border-border/60 bg-surface object-cover", className)}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [from, to] = gradients[h % gradients.length] ?? ["#0066FF", "#00C2FF"];
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: size * 0.4,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
