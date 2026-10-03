import Link from "next/link";
import { cn } from "@/lib/cn";

export function TagBadge({
  name,
  color,
  size = "sm",
  href,
}: {
  name: string;
  color: string;
  size?: "sm" | "md";
  href?: string;
}) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#0066FF";
  const className = cn(
    "relative z-10 inline-flex items-center rounded-md font-medium",
    size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
  );
  const style = { backgroundColor: `${safe}1A`, color: safe };
  return href ? (
    <Link href={href} className={cn(className, "hover:opacity-80")} style={style}>
      {name}
    </Link>
  ) : (
    <span className={className} style={style}>
      {name}
    </span>
  );
}
