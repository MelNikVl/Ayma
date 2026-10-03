import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

interface Props {
  children: string;
  /**
   * Для README из GitHub: относительные ссылки и картинки переписываются
   * на github.com / raw.githubusercontent.com, а безопасный HTML (img, details, br…) рендерится.
   */
  repo?: { owner: string; repo: string; dir?: string };
}

function resolveRepoUrl(url: string, key: string, repo: NonNullable<Props["repo"]>): string {
  if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(url)) return url;
  const clean = url.replace(/^\.\//, "");
  const path = clean.startsWith("/") ? clean.slice(1) : [repo.dir, clean].filter(Boolean).join("/");
  const base =
    key === "src"
      ? `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/HEAD/`
      : `https://github.com/${repo.owner}/${repo.repo}/blob/HEAD/`;
  return base + path;
}

/** Безопасный рендер Markdown (сырой HTML — только для README и только после санитайзера). */
export function Markdown({ children, repo }: Props) {
  return (
    <div className="prose-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={repo ? [rehypeRaw, rehypeSanitize] : []}
        urlTransform={(url, key) => defaultUrlTransform(repo ? resolveRepoUrl(url, key, repo) : url)}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
          img: ({ node: _node, ...props }) => <img {...props} alt={props.alt ?? ""} loading="lazy" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
