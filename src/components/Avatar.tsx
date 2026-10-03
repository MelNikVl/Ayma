import { cn } from "@/lib/cn";

interface AvatarUser {
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
}

const palette = ["#0066FF", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#0891B2", "#4F46E5"];

function colorFor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length] ?? "#0066FF";
}

export function Avatar({ user, size = 32, className }: { user: AvatarUser; size?: number; className?: string }) {
  const label = user.firstName ?? user.username ?? "?";
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={label}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-label={label}
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: colorFor(label), fontSize: size * 0.42 }}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}
