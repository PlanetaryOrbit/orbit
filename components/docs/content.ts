import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { DocVideo } from "./extensions/video";
import { normalizeVideoUrl } from "./media";

const tiptapExtensions = [
  StarterKit,
  Image.configure({ inline: false, allowBase64: true }),
  DocVideo,
];

const SAFE_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img", "h1", "h2", "h3", "video", "iframe",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "class"],
    video: ["src", "controls", "playsinline", "class"],
    iframe: ["src", "class", "frameborder", "allow", "allowfullscreen"],
  },
  allowedSchemes: ["http", "https"],
  allowedSchemesAppliedToAttributes: ["src", "href"],
  allowedClasses: {
    video: ["doc-video"],
    iframe: ["doc-video-embed"],
    img: ["doc-media-image"],
  },
  transformTags: {
    iframe: (tagName, attribs) => {
      const src = attribs.src || "";
      const isAllowed =
        /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com)/.test(src);
      if (!isAllowed) return { tagName: "div", attribs: {} }; // strip unknown iframes
      return { tagName, attribs: { ...attribs, src } };
    },
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
  },
};

export type ParsedDocumentContent =
  | { type: "markdown"; content: string }
  | { type: "html"; content: string }
  | { type: "external"; content: { external: true; url: string; title?: string } };

export function isExternalContent(content: unknown): content is {
  external: true;
  url: string;
  title?: string;
} {
  return (
    typeof content === "object" &&
    content !== null &&
    "external" in content &&
    (content as { external?: boolean }).external === true &&
    typeof (content as { url?: unknown }).url === "string"
  );
}

export function parseDocumentContent(content: unknown): ParsedDocumentContent {
  if (typeof content === "string") {
    return { type: "markdown", content };
  }
  if (isExternalContent(content)) {
    return { type: "external", content };
  }
  try {
    const raw = generateHTML(content as object, tiptapExtensions);
    // sanitize generateHTML output before it ever hits dangerouslySetInnerHTML
    return { type: "html", content: sanitizeHtml(raw, SAFE_HTML_OPTIONS) };
  } catch {
    return { type: "markdown", content: String(content ?? "") };
  }
}

function convertNodeToMarkdown(node: any): string {
  if (!node) return "";
  switch (node.type) {
    case "doc":
      return (node.content || []).map(convertNodeToMarkdown).join("\n\n");
    case "paragraph":
      return (node.content || []).map(convertNodeToMarkdown).join("");
    case "heading": {
      const level = node.attrs?.level || 1;
      const text = (node.content || []).map(convertNodeToMarkdown).join("");
      return `${"#".repeat(level)} ${text}`;
    }
    case "text": {
      let txt = node.text || "";
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === "bold") txt = `**${txt}**`;
          if (mark.type === "italic") txt = `*${txt}*`;
          if (mark.type === "underline") txt = `<u>${txt}</u>`;
          if (mark.type === "strike") txt = `~~${txt}~~`;
          if (mark.type === "code") txt = `\`${txt}\``;
          if (mark.type === "link") txt = `[${txt}](${mark.attrs?.href ?? ""})`;
        }
      }
      return txt;
    }
    case "listItem":
      return (node.content || []).map(convertNodeToMarkdown).join("\n");
    case "bulletList":
      return (node.content || [])
        .map((li: any) => {
          const inner = (li.content || []).map(convertNodeToMarkdown).join("");
          return `- ${inner}`;
        })
        .join("\n");
    case "orderedList":
      return (node.content || [])
        .map((li: any, idx: number) => {
          const inner = (li.content || []).map(convertNodeToMarkdown).join("");
          return `${idx + 1}. ${inner}`;
        })
        .join("\n");
    case "codeBlock":
      return `\n\n\`\`\`\n${node.content?.[0]?.text || ""}\n\`\`\`\n\n`;
    case "blockquote":
      return (node.content || [])
        .map(convertNodeToMarkdown)
        .map((l: string) => `> ${l}`)
        .join("\n");
    case "hardBreak":
      return "\n";
    case "image": {
      const alt = node.attrs?.alt || "";
      const src = node.attrs?.src || "";
      return src ? `\n\n![${alt}](${src})\n\n` : "";
    }
    case "video": {
      const src = node.attrs?.src || "";
      if (!src) return "";
      const normalized = normalizeVideoUrl(src);
      if (normalized.type === "embed") {
        return `\n\n<iframe src="${normalized.src}" class="doc-video-embed" frameborder="0" allowfullscreen></iframe>\n\n`;
      }
      return `\n\n<video src="${normalized.src}" controls playsinline class="doc-video"></video>\n\n`;
    }
    default:
      return (node.content || []).map(convertNodeToMarkdown).join("");
  }
}

function convertOldToMarkdown(html: string): string {
  if (!html) return "";
  let s = html;
  for (let i = 6; i >= 1; i--) {
    s = s.replace(
      new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, "gi"),
      (_m, p1) => `${"#".repeat(i)} ${p1.trim()}`
    );
  }
  s = s.replace(
    /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi,
    (_m, p1) => `**${p1.trim()}**`
  );
  s = s.replace(
    /<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi,
    (_m, p1) => `*${p1.trim()}*`
  );
  s = s.replace(
    /<a[^>]*href=["']?([^"' >]+)["']?[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href, text) => `[${text.trim()}](${href.trim()})`
  );
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner) =>
    inner
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_mi: string, li: string) => `- ${li.trim()}`)
      .trim()
  );
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner) => {
    let idx = 1;
    return inner
      .replace(
        /<li[^>]*>([\s\S]*?)<\/li>/gi,
        (_mi: string, li: string) => `${idx++}. ${li.trim()}`
      )
      .trim();
  });
  s = s.replace(/<br\s*\/?>(\s*)/gi, "\n");
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, p1) => `${p1.trim()}\n\n`);
  s = s.replace(
    /<img[^>]*src=["']?([^"' >]+)["']?[^>]*alt=["']?([^"']*)["']?[^>]*>/gi,
    (_m, src, alt) => `\n\n![${alt || ""}](${src})\n\n`
  );
  s = s.replace(
    /<img[^>]*src=["']?([^"' >]+)["']?[^>]*>/gi,
    (_m, src) => `\n\n![](${src})\n\n`
  );
  s = s.replace(
    /<video[^>]*src=["']?([^"' >]+)["']?[^>]*><\/video>/gi,
    (_m, src) => `\n\n<video src="${src}" controls playsinline class="doc-video"></video>\n\n`
  );
  s = s.replace(
    /<iframe[^>]*src=["']?([^"' >]+)["']?[^>]*><\/iframe>/gi,
    (_m, src) =>
      `\n\n<iframe src="${src}" class="doc-video-embed" frameborder="0" allowfullscreen></iframe>\n\n`
  );
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/g, " ");
  s = s.replace(/&amp;/g, "&");
  s = s.replace(/&lt;/g, "<");
  s = s.replace(/&gt;/g, ">");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export function tiptapJsonToMarkdown(json: unknown): string {
  try {
    return convertNodeToMarkdown(json) || "";
  } catch {
    return "";
  }
}

export function documentContentToMarkdown(content: unknown): string {
  if (typeof content === "string") {
    const s = String(content);
    return /<[^>]+>/.test(s) ? convertOldToMarkdown(s) : s;
  }
  if (isExternalContent(content)) return "";
  return tiptapJsonToMarkdown(content);
}

export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return "<p></p>";
  return marked.parse(markdown, { async: false, breaks: true }) as string;
}

export function renderMarkdownToSafeHtml(markdown: string): string {
  const raw = marked.parse(markdown, { async: false, breaks: true }) as string;
  return sanitizeHtml(raw, SAFE_HTML_OPTIONS);
}

export const docMediaProseClass =
  "[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-xl [&_video.doc-video]:my-4 [&_video.doc-video]:max-w-full [&_video.doc-video]:rounded-xl [&_iframe.doc-video-embed]:my-4 [&_iframe.doc-video-embed]:aspect-video [&_iframe.doc-video-embed]:w-full [&_iframe.doc-video-embed]:rounded-xl";

export function getDocumentMode(content: unknown): "internal" | "external" {
  return isExternalContent(content) ? "external" : "internal";
}
