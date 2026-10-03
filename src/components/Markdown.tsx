import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Безопасный рендер Markdown: сырой HTML не поддерживается (react-markdown экранирует его по умолчанию). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
