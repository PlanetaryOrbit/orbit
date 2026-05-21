import { Node, mergeAttributes } from "@tiptap/core";
import { normalizeVideoUrl } from "../media";

export const DocVideo = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video[src]",
        getAttrs: (element: HTMLElement) => ({
          src: (element as HTMLVideoElement).getAttribute("src"),
        }),
      },
      {
        tag: 'iframe[src][class*="doc-video-embed"]',
        getAttrs: (element: HTMLElement) => ({
          src: (element as HTMLIFrameElement).getAttribute("src"),
        }),
      },
      {
        tag: "iframe[src]",
        getAttrs: (element: HTMLElement) => {
          const src = (element as HTMLIFrameElement).getAttribute("src") || "";
          if (!/youtube\.com\/embed|player\.vimeo\.com/.test(src)) return false;
          return { src };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const src = String(HTMLAttributes.src || "");
    const normalized = normalizeVideoUrl(src);

    if (normalized.type === "embed") {
      return [
        "iframe",
        mergeAttributes(HTMLAttributes, {
          src: normalized.src,
          class: "doc-video-embed",
          frameborder: "0",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
        }),
      ];
    }

    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        src: normalized.src,
        controls: "true",
        playsinline: "true",
        class: "doc-video",
      }),
    ];
  },
});
