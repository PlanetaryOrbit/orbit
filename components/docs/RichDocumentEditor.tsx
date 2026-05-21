"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconLink,
  IconQuote,
  IconPhoto,
  IconGif,
  IconVideo,
} from "@tabler/icons-react";
import { LinkInsertModal, MediaInsertModal } from "./modals";
import { docMediaProseClass, markdownToHtml, tiptapJsonToMarkdown } from "./content";
import { DocVideo } from "./extensions/video";
import { readImageFile, readVideoFile } from "./media";

type RichDocumentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onExternalLink: (url: string) => void;
  disabled?: boolean;
  className?: string;
};

type MediaKind = "image" | "gif" | "video";

function BubbleBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={clsx(
        "rounded-md p-1.5 transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function InsertBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

export default function RichDocumentEditor({
  value,
  onChange,
  onExternalLink,
  disabled,
  className,
}: RichDocumentEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const lastEmitted = useRef(value);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const emitMarkdown = useCallback(
    (editor: NonNullable<ReturnType<typeof useEditor>>) => {
      const md = tiptapJsonToMarkdown(editor.getJSON());
      lastEmitted.current = md;
      onChange(md);
    },
    [onChange]
  );

  const insertImage = useCallback(
    (editor: NonNullable<ReturnType<typeof useEditor>>, src: string, alt = "") => {
      editor.chain().focus().setImage({ src, alt }).run();
      emitMarkdown(editor);
    },
    [emitMarkdown]
  );

  const insertVideo = useCallback(
    (editor: NonNullable<ReturnType<typeof useEditor>>, src: string) => {
      editor.chain().focus().insertContent({ type: "video", attrs: { src } }).run();
      emitMarkdown(editor);
    },
    [emitMarkdown]
  );

  const handleImageFile = useCallback(
    async (file: File, editor: NonNullable<ReturnType<typeof useEditor>>) => {
      setMediaUploading(true);
      setMediaError(null);
      try {
        const dataUrl = await readImageFile(file);
        insertImage(editor, dataUrl, file.name);
        setMediaKind(null);
        setMediaUrl("");
      } catch (e: any) {
        setMediaError(e?.message || "Failed to upload image");
      } finally {
        setMediaUploading(false);
      }
    },
    [insertImage]
  );

  const handleVideoFile = useCallback(
    async (file: File, editor: NonNullable<ReturnType<typeof useEditor>>) => {
      setMediaUploading(true);
      setMediaError(null);
      try {
        const dataUrl = await readVideoFile(file);
        insertVideo(editor, dataUrl);
        setMediaKind(null);
        setMediaUrl("");
      } catch (e: any) {
        setMediaError(e?.message || "Failed to upload video");
      } finally {
        setMediaUploading(false);
      }
    },
    [insertVideo]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 cursor-pointer",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "doc-media-image",
        },
      }),
      DocVideo,
      Placeholder.configure({
        placeholder: "Start writing…",
      }),
    ],
    content: markdownToHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: clsx(
          "doc-editor prose prose-zinc dark:prose-invert max-w-none min-h-[50vh] px-4 py-2 focus:outline-none sm:px-6 [&_.is-editor-empty:first-child::before]:text-zinc-300 [&_.is-editor-empty:first-child::before]:dark:text-zinc-600 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:leading-relaxed",
          docMediaProseClass
        ),
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        const link = target.closest("a");
        const href = link?.getAttribute("href");
        if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
          event.preventDefault();
          onExternalLink(href);
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const ed = editorRef.current;
        if (!ed || disabled) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) void handleImageFile(file, ed);
            return true;
          }
        }
        return false;
      },
      handleDrop: (_view, event, _slice, moved) => {
        const ed = editorRef.current;
        if (!ed || disabled || moved) return false;
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        const file = files[0];
        event.preventDefault();

        if (file.type.startsWith("image/")) {
          void handleImageFile(file, ed);
          return true;
        }
        if (file.type.startsWith("video/")) {
          void handleVideoFile(file, ed);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (syncingRef.current) return;
      emitMarkdown(ed);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    syncingRef.current = true;
    editor.commands.setContent(markdownToHtml(value), false);
    lastEmitted.current = value;
    syncingRef.current = false;
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const openLinkModal = () => {
    if (!editor || disabled) return;
    const { from, to } = editor.state.selection;
    setLinkText(editor.state.doc.textBetween(from, to, " ") || "");
    setLinkUrl(editor.getAttributes("link").href || "");
    setShowLinkModal(true);
  };

  const openMediaModal = (kind: MediaKind) => {
    if (disabled) return;
    setMediaKind(kind);
    setMediaUrl("");
    setMediaError(null);
  };

  const confirmLinkInsert = () => {
    if (!editor || !linkUrl.trim()) return;
    const href = linkUrl.trim();
    if (editor.state.selection.empty && linkText.trim()) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${href}">${linkText.trim()}</a>`)
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setShowLinkModal(false);
    setLinkUrl("");
    setLinkText("");
    emitMarkdown(editor);
  };

  const confirmMediaInsert = () => {
    if (!editor || !mediaKind || !mediaUrl.trim()) return;
    const src = mediaUrl.trim();

    if (mediaKind === "video") {
      insertVideo(editor, src);
    } else {
      insertImage(editor, src, mediaKind === "gif" ? "GIF" : "");
    }

    setMediaKind(null);
    setMediaUrl("");
    setMediaError(null);
  };

  const handleMediaFileSelect = (file: File) => {
    if (!editor || !mediaKind) return;
    if (mediaKind === "video") {
      void handleVideoFile(file, editor);
    } else {
      if (mediaKind === "gif" && file.type !== "image/gif") {
        setMediaError("Please choose a GIF file.");
        return;
      }
      void handleImageFile(file, editor);
    }
  };

  return (
    <>
      <div className={clsx("relative flex-1", className)}>
        {!disabled && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 px-4 sm:px-6">
            <InsertBtn onClick={() => openMediaModal("image")} title="Insert image">
              <IconPhoto className="h-3.5 w-3.5" stroke={1.75} />
              Image
            </InsertBtn>
            <InsertBtn onClick={() => openMediaModal("gif")} title="Insert GIF">
              <IconGif className="h-3.5 w-3.5" stroke={1.75} />
              GIF
            </InsertBtn>
            <InsertBtn onClick={() => openMediaModal("video")} title="Insert video">
              <IconVideo className="h-3.5 w-3.5" stroke={1.75} />
              Video
            </InsertBtn>
          </div>
        )}

        {editor && !disabled && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100, placement: "top", offset: [0, 8] }}
            className="flex items-center gap-0.5 rounded-lg border border-zinc-200/90 bg-white/95 p-0.5 shadow-xl backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95"
          >
            <BubbleBtn
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <IconBold className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <BubbleBtn
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <IconItalic className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <BubbleBtn
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <IconUnderline className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <BubbleBtn
              title="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <IconStrikethrough className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <span className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
            <BubbleBtn
              title="Heading 1"
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <IconH1 className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <BubbleBtn
              title="Heading 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <IconH2 className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <BubbleBtn
              title="Heading 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <IconH3 className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <span className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
            <BubbleBtn
              title="Bullet list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <IconList className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <BubbleBtn
              title="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <IconListNumbers className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <BubbleBtn
              title="Quote"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <IconQuote className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
            <BubbleBtn
              title="Link"
              active={editor.isActive("link")}
              onClick={openLinkModal}
            >
              <IconLink className="h-3.5 w-3.5" stroke={2.5} />
            </BubbleBtn>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>

      <LinkInsertModal
        open={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        linkText={linkText}
        linkUrl={linkUrl}
        onLinkTextChange={setLinkText}
        onLinkUrlChange={setLinkUrl}
        onConfirm={confirmLinkInsert}
      />

      {mediaKind ? (
        <MediaInsertModal
          open={!!mediaKind}
          onClose={() => {
            setMediaKind(null);
            setMediaUrl("");
            setMediaError(null);
          }}
          kind={mediaKind}
          mediaUrl={mediaUrl}
          onMediaUrlChange={setMediaUrl}
          onConfirm={confirmMediaInsert}
          onFileSelect={handleMediaFileSelect}
          uploading={mediaUploading}
          error={mediaError}
        />
      ) : null}
    </>
  );
}
