import { useMemo } from "react";
import clsx from "clsx";
import { parseDocumentContent, renderMarkdownToSafeHtml, docMediaProseClass } from "./content";
import sanitizehtml from "sanitize-html"
import { HTML_OPTIONS } from "@/lib/xss";

export function DocViewer({
  content,
  onExternalLink,
}: {
  content: unknown;
  onExternalLink: (url: string) => void;
}) {
  const output = useMemo(() => parseDocumentContent(content), [content]);

  if (output.type === "external") {
    return null;
  }

  return (
    <div className={clsx("prose prose-zinc dark:prose-invert max-w-none [&_p]:leading-relaxed [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg", docMediaProseClass)}>
      {output.type === "html" ? (
        <div
          dangerouslySetInnerHTML={{ __html: sanitizehtml(output.content, HTML_OPTIONS) }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const link = target.closest("a");
            const href = link?.getAttribute("href");
            if (
              href &&
              (href.startsWith("http://") || href.startsWith("https://"))
            ) {
              e.preventDefault();
              onExternalLink(href);
            }
          }}
        />
      ) : (
        <div
          className="doc-viewer-content"
          dangerouslySetInnerHTML={{ __html: sanitizehtml(renderMarkdownToSafeHtml(output.content), HTML_OPTIONS) }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const link = target.closest("a");
            const href = link?.getAttribute("href");
            if (
              href &&
              (href.startsWith("http://") || href.startsWith("https://"))
            ) {
              e.preventDefault();
              onExternalLink(href);
            }
          }}
        />
      )}
    </div>
  );
}
