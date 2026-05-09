"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/components/copy-button";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children, ...props }: any) {
            // Extract text from the code element inside pre
            const codeEl: any = (children as React.ReactElement)?.props || {};
            const codeText: string =
              typeof codeEl?.children === "string"
                ? codeEl.children
                : Array.isArray(codeEl?.children)
                ? codeEl.children.join("")
                : "";

            return (
              <pre {...props} className="relative group">
                {children}
                <CopyButton text={codeText} />
              </pre>
            );
          },
          // Override anchor to open external links in new tab
          a({ href, children, ...props }: any) {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                {...props}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
