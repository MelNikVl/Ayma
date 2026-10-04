import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { FileIcon, LinkedinIcon } from "./icons";

/** Ссылки разработчика: LinkedIn и резюме (PDF) */
export function DevLinks({
  linkedinUrl,
  resumeUrl,
  size = "sm",
  className,
}: {
  linkedinUrl: string | null;
  resumeUrl: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const { d } = getI18n();
  if (!linkedinUrl && !resumeUrl) return null;
  const pill =
    size === "md"
      ? "btn-secondary btn-sm"
      : "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg";
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", className)}>
      {linkedinUrl && (
        <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className={pill} title="LinkedIn" aria-label="LinkedIn">
          <LinkedinIcon className={cn("text-[#0A66C2]", size === "md" ? "h-4 w-4" : "h-3.5 w-3.5")} />
          {size === "md" && "LinkedIn"}
        </a>
      )}
      {resumeUrl && (
        <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className={pill} title={d.resume.open}>
          <FileIcon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          {d.resume.open}
        </a>
      )}
    </span>
  );
}
