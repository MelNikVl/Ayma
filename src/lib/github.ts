import "server-only";
import { env } from "./env";

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface RepoInfo {
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  pushedAt: Date | null;
  description: string | null;
  license: string | null;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: Date;
  url: string;
}

/** Разбор ссылки вида https://github.com/owner/repo(.git)(/...) */
export function parseGithubUrl(url: string | null | undefined): RepoRef | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
    const [owner, rawRepo] = u.pathname.split("/").filter(Boolean);
    if (!owner || !rawRepo) return null;
    const repo = rawRepo.replace(/\.git$/, "");
    if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ayma",
  };
  if (env.githubToken) h.Authorization = `Bearer ${env.githubToken}`;
  return h;
}

export async function fetchRepoInfo(ref: RepoRef, opts: { fresh?: boolean } = {}): Promise<RepoInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}`, {
      headers: headers(),
      ...(opts.fresh ? { cache: "no-store" as const } : { next: { revalidate: 3600 } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      stargazers_count?: number;
      forks_count?: number;
      open_issues_count?: number;
      language?: string | null;
      pushed_at?: string | null;
      description?: string | null;
      license?: { spdx_id?: string } | null;
    };
    return {
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      language: data.language ?? null,
      pushedAt: data.pushed_at ? new Date(data.pushed_at) : null,
      description: data.description ?? null,
      license: data.license?.spdx_id && data.license.spdx_id !== "NOASSERTION" ? data.license.spdx_id : null,
    };
  } catch {
    return null;
  }
}

export async function fetchRecentCommits(ref: RepoRef, limit = 5): Promise<CommitInfo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${ref.owner}/${ref.repo}/commits?per_page=${limit}`,
      { headers: headers(), next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      sha: string;
      html_url: string;
      commit: { message: string; author?: { name?: string; date?: string } | null };
      author?: { login?: string } | null;
    }>;
    return data.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0] ?? "",
      author: c.author?.login ?? c.commit.author?.name ?? "unknown",
      date: new Date(c.commit.author?.date ?? Date.now()),
      url: c.html_url,
    }));
  } catch {
    return [];
  }
}
