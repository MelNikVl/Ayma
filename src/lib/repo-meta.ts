/** Данные репозитория, сохранённые при импорте (Startup.repoMeta). */
export interface RepoMeta {
  team?: string; // название команды
  hackathon?: { industry: string; partner: string; task: string } | null;
  maturity?: string | null; // стадия: «Рабочий MVP» и т.п.
  readmePath?: string | null; // путь к README внутри репозитория
  authors?: Array<[string, number]>; // [автор коммитов, число коммитов]
  commits?: Array<[string, string, string]>; // [дата «YYYY-MM-DDTHH:mm» (Астана), автор, сообщение]
  branches?: string[];
  tree?: string[]; // пути файлов
}

export function parseRepoMeta(value: unknown): RepoMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as RepoMeta;
}
