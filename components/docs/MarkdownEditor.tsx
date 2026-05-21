import dynamic from "next/dynamic";

const RichDocumentEditor = dynamic(() => import("./RichDocumentEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-primary dark:border-zinc-700" />
    </div>
  ),
});

export type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onExternalLink: (url: string) => void;
  disabled?: boolean;
  className?: string;
};

export function MarkdownEditor(props: MarkdownEditorProps) {
  return <RichDocumentEditor {...props} />;
}
