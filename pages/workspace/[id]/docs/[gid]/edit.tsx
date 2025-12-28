import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Button from "@/components/button";
import Input from "@/components/input";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  IconCheck,
  IconChevronDown,
  IconH1,
  IconH2,
  IconH3,
  IconH4,
  IconBold,
  IconItalic,
  IconListDetails,
  IconArrowLeft,
  IconLock,
  IconTrash,
  IconEdit,
  IconWorld,
  IconEye,
  IconCode,
  IconLink,
  IconExternalLink,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import axios from "axios";
import prisma from "@/utils/database";
import { useForm, FormProvider } from "react-hook-form";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import clsx from "clsx";
import { Toaster, toast } from "react-hot-toast";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async (context) => {
    const { id, gid } = context.query;
    if (!gid) return { notFound: true };

    const [roles, departments, document] = await Promise.all([
      prisma.role.findMany({
        where: {
          workspaceGroupId: Number(id),
        },
        orderBy: {
          isOwnerRole: "desc",
        },
      }),
      prisma.department.findMany({
        where: {
          workspaceGroupId: Number(id),
        },
        select: {
          id: true,
          name: true,
          color: true,
        },
      }),
      prisma.document.findUnique({
        where: {
          id: gid as string,
        },
        include: {
          roles: true,
          departments: true,
        },
      }),
    ]);

    if (!document) return { notFound: true };

    return {
      props: {
        roles,
        departments: JSON.parse(
          JSON.stringify(departments, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        document: JSON.parse(
          JSON.stringify(document, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
      },
    };
  },
  "manage_docs"
);

const EditDoc: pageWithLayout<any> = ({ roles, departments, document }) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    document.roles.map((role: any) => role.id)
  );
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    document.departments ? document.departments.map((dept: any) => dept.id) : []
  );
  const [mode, setMode] = useState<"internal" | "external">(() => {
    if (document.content && (document.content as any).external)
      return "external";
    return "internal";
  });
  const convertNodeToMarkdown = (node: any): string => {
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
            if (mark.type === "code") txt = `\`${txt}\``;
          }
        }
        return txt;
      }
      case "bulletList":
        return (node.content || [])
          .map((li: any) => {
            const inner = (li.content || [])
              .map(convertNodeToMarkdown)
              .join("");
            return `- ${inner}`;
          })
          .join("\n");
      case "orderedList":
        return (node.content || [])
          .map((li: any, idx: number) => {
            const inner = (li.content || [])
              .map(convertNodeToMarkdown)
              .join("");
            return `${idx + 1}. ${inner}`;
          })
          .join("\n");
      case "codeBlock":
        return (
          "\n\n```" +
          (node.content && node.content[0] ? node.content[0].text || "" : "") +
          "```\n\n"
        );
      case "blockquote":
        return (node.content || [])
          .map(convertNodeToMarkdown)
          .map((l: string) => `> ${l}`)
          .join("\n");
      case "hardBreak":
        return "\n";
      default:
        return (node.content || []).map(convertNodeToMarkdown).join("");
    }
  };

  const convertOldToMarkdown = (html: string): string => {
    if (!html) return "";
    let s = html;
    for (let i = 6; i >= 1; i--) {
      s = s.replace(
        new RegExp(`<h${i}[^>]*>([\s\S]*?)<\/h${i}>`, "gi"),
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
      (_m, href, text) => {
        return `[${text.trim()}](${href.trim()})`;
      }
    );
    s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner) => {
      return inner
        .replace(
          /<li[^>]*>([\s\S]*?)<\/li>/gi,
          (_mi: any, li: any) => `- ${li.trim()}`
        )
        .trim();
    });
    s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner) => {
      let idx = 1;
      return inner
        .replace(
          /<li[^>]*>([\s\S]*?)<\/li>/gi,
          (_mi: any, li: any) => `${idx++}. ${li.trim()}`
        )
        .trim();
    });
    s = s.replace(
      /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
      (_m, code) => `\n\n\`\`\`\n${code.replace(/<[^>]+>/g, "")}\n\`\`\`\n\n`
    );
    s = s.replace(
      /<code[^>]*>([\s\S]*?)<\/code>/gi,
      (_m, code) => "`" + code.replace(/<[^>]+>/g, "") + "`"
    );
    s = s.replace(/<br\s*\/?>(\s*)/gi, "\n");
    s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, p1) => `${p1.trim()}\n\n`);
    s = s.replace(/<[^>]+>/g, "");
    s = s.replace(/&nbsp;/g, " ");
    s = s.replace(/&amp;/g, "&");
    s = s.replace(/&lt;/g, "<");
    s = s.replace(/&gt;/g, ">");
    s = s.replace(/\n{3,}/g, "\n\n");
    return s.trim();
  };

  const initialMarkdown = (() => {
    if (typeof document.content === "string") {
      const s = String(document.content);
      const looksLikeHtml = /<[^>]+>/.test(s);
      if (looksLikeHtml) return convertOldToMarkdown(s);
      return s;
    }
    try {
      return convertNodeToMarkdown(document.content as any) || "";
    } catch (e) {
      return "";
    }
  })();

  const [markdownContent, setMarkdownContent] =
    useState<string>(initialMarkdown);
  const [externalUrl, setExternalUrl] = useState<string>(() =>
    document.content && (document.content as any).external
      ? (document.content as any).url || ""
      : ""
  );
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showExternalLinkModal, setShowExternalLinkModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const markdownRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      name: document.name,
    },
  });

  const editor = useEditor({
    extensions: [StarterKit],
    editable: false,
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert max-w-none focus:outline-none",
      },
    },
    content:
      typeof document.content === "string"
        ? document.content
        : document.content,
  });

  const goback = () => {
    router.push(`/workspace/${workspace.groupId}/docs`);
  };

  const updateDoc = async () => {
    let content: any = null;
    if (mode === "external") {
      if (!externalUrl.trim()) {
        form.setError("name", {
          type: "custom",
          message: "External URL required",
        });
        return;
      }
      content = {
        external: true,
        url: externalUrl.trim(),
        title: form.getValues().name,
      };
    } else {
      content = markdownContent;
    }

    const session = await axios
      .post(
        `/api/workspace/${workspace.groupId}/guides/${document.id}/update`,
        {
          name: form.getValues().name,
          content,
          roles: selectedRoles,
          departments: selectedDepartments,
        }
      )
      .catch((err) => {
        form.setError("name", {
          type: "custom",
          message: err?.response?.data?.error || "Failed to update",
        });
      });
    if (!session) return;
    form.clearErrors();
    if (mode === "external") {
      toast.success("Saved");
      router.push(`/workspace/${workspace.groupId}/docs`);
    } else {
      toast.success("Saved");
      router.push(`/workspace/${workspace.groupId}/docs/${document.id}`);
    }
  };

  const toggleRole = async (role: string) => {
    setSelectedRoles((prevRoles) => {
      if (prevRoles.includes(role)) {
        return prevRoles.filter((r) => r !== role);
      } else {
        return [...prevRoles, role];
      }
    });
  };

  const toggleDepartment = async (deptId: string) => {
    setSelectedDepartments((prevDepts) => {
      if (prevDepts.includes(deptId)) {
        return prevDepts.filter((d) => d !== deptId);
      } else {
        return [...prevDepts, deptId];
      }
    });
  };

  const buttons = {
    heading: [
      {
        icon: IconH1,
        function: () =>
          editor?.chain().focus().toggleHeading({ level: 1 }).run(),
        active: () => editor?.isActive("heading", { level: 1 }),
      },
      {
        icon: IconH2,
        function: () =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        active: () => editor?.isActive("heading", { level: 2 }),
      },
      {
        icon: IconH3,
        function: () =>
          editor?.chain().focus().toggleHeading({ level: 3 }).run(),
        active: () => editor?.isActive("heading", { level: 3 }),
      },
      {
        icon: IconH4,
        function: () =>
          editor?.chain().focus().toggleHeading({ level: 4 }).run(),
        active: () => editor?.isActive("heading", { level: 4 }),
      },
    ],
    util: [
      {
        icon: IconBold,
        function: () => editor?.chain().focus().toggleBold().run(),
        active: () => editor?.isActive("bold"),
      },
      {
        icon: IconItalic,
        function: () => editor?.chain().focus().toggleItalic().run(),
        active: () => editor?.isActive("italic"),
      },
    ],
    list: [
      {
        icon: IconListDetails,
        function: () => editor?.chain().focus().toggleBulletList().run(),
        active: () => editor?.isActive("bulletList"),
      },
    ],
  };

  const confirmDelete = async () => {
  if (!document.id) return;

  try {
    await axios.post(`/api/workspace/${workspace.groupId}/guides/${document.id}/delete`);
	toast.success("Deleted document!");
  } catch (e: any) {
    console.error(e);
    toast.error("Failed to delete document.");
  } finally {
    setShowDeleteModal(false);
    router.push(`/workspace/${workspace.groupId}/docs`);
  }
  };

  const insertMarkdown = (tokenBefore: string, tokenAfter = tokenBefore) => {
    const el = markdownRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end);
    const newVal =
      el.value.substring(0, start) +
      tokenBefore +
      selected +
      tokenAfter +
      el.value.substring(end);
    setMarkdownContent(newVal);
    setTimeout(() => {
      el.focus();
      el.selectionStart = start + tokenBefore.length;
      el.selectionEnd = end + tokenBefore.length;
    }, 0);
  };

  const insertLink = () => {
    const el = markdownRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end);
    setLinkText(selected || "");
    setLinkUrl("");
    setShowLinkModal(true);
  };

  const confirmLinkInsert = () => {
    if (!linkUrl.trim()) return;
    const el = markdownRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const finalLinkText = linkText.trim() || linkUrl;
    const newVal =
      el.value.substring(0, start) +
      `[${finalLinkText}](${linkUrl.trim()})` +
      el.value.substring(end);
    setMarkdownContent(newVal);
    setShowLinkModal(false);
    setLinkUrl("");
    setLinkText("");
    setTimeout(() => {
      el.focus();
      const newStart = start + finalLinkText.length + 3 + linkUrl.trim().length + 1;
      el.selectionStart = newStart;
      el.selectionEnd = newStart;
    }, 0);
  };

  const cancelLinkInsert = () => {
    setShowLinkModal(false);
    setLinkUrl("");
    setLinkText("");
  };

  const handleExternalLink = (url: string) => {
    setPendingUrl(url);
    setShowExternalLinkModal(true);
  };

  const proceedWithLink = () => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank');
    }
    setShowExternalLinkModal(false);
    setPendingUrl(null);
  };

  const cancelLink = () => {
    setShowExternalLinkModal(false);
    setPendingUrl(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push(`/workspace/${workspace.groupId}/docs`)}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Go back"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-1">
              Edit Document
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Update your workspace documentation
            </p>
          </div>
        </div>
        <FormProvider {...form}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconEdit className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Document Information
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Basic details about your document
                    </p>
                  </div>
                </div>
                <Input
                  {...form.register("name", {
                    required: {
                      value: true,
                      message: "Document name is required",
                    },
                  })}
                  label="Document Name"
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 sticky top-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconLock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Access Control
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Who can view this document
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {roles.map((role: any) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-all group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="w-4 h-4 text-primary rounded border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-primary/50 focus:ring-offset-0"
                      />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                        {role.name}
                      </span>
                    </label>
                  ))}
                </div>

                {departments && departments.length > 0 && (
                  <>
                    <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                        Departments
                      </h3>
                      <div className="space-y-2">
                        {departments.map((dept: any) => (
                          <label
                            key={dept.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-all group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDepartments.includes(dept.id)}
                              onChange={() => toggleDepartment(dept.id)}
                              className="w-4 h-4 text-primary rounded border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-primary/50 focus:ring-offset-0"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                              {dept.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {mode === "internal" && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                {!showPreview && (
                  <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={() => insertMarkdown("**", "**")}
                      className="p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      aria-label="Bold"
                      title="Bold"
                    >
                      <IconBold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertMarkdown("*", "*")}
                      className="p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      aria-label="Italic"
                      title="Italic"
                    >
                      <IconItalic className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600" />
                    <button
                      onClick={() => insertMarkdown("# ")}
                      className="p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      aria-label="Heading 1"
                      title="Heading 1"
                    >
                      <IconH1 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertMarkdown("## ")}
                      className="p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      aria-label="Heading 2"
                      title="Heading 2"
                    >
                      <IconH2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertMarkdown("### ")}
                      className="p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      aria-label="Heading 3"
                      title="Heading 3"
                    >
                      <IconH3 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600" />
                    <button
                      onClick={() => insertMarkdown("- ")}
                      className="p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      aria-label="List"
                      title="List"
                    >
                      <IconListDetails className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600" />
                    <button
                      onClick={insertLink}
                      className="p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      aria-label="Link"
                      title="Insert Link"
                    >
                      <IconLink className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  {showPreview ? (
                    <>
                      <IconCode className="w-4 h-4" />
                      Edit
                    </>
                  ) : (
                    <>
                      <IconEye className="w-4 h-4" />
                      Preview
                    </>
                  )}
                </button>
              </div>
              {showPreview ? (
                <div className="w-full h-80 p-4 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 overflow-y-auto">
                  <style dangerouslySetInnerHTML={{__html: `
                    .preview-content ul,
                    .preview-content ol {
                      list-style: none !important;
                      padding-left: 0 !important;
                      margin-left: 0 !important;
                    }
                    .preview-content li {
                      list-style: none !important;
                      padding-left: 0 !important;
                      margin-left: 0 !important;
                    }
                    .preview-content li::before,
                    .preview-content li::after,
                    .preview-content p::before,
                    .preview-content p::after {
                      content: none !important;
                      display: none !important;
                    }
                  `}} />
                  {markdownContent.trim() ? (
                    <div className="prose dark:prose-invert max-w-none preview-content">
                      <ReactMarkdown
                        rehypePlugins={[rehypeSanitize]}
                        components={{
                          a: ({ node, href, children, ...props }: any) => {
                            const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
                            return (
                              <span className="relative inline-block">
                                <a
                                  {...props}
                                  href={href}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (isExternal && href) {
                                      handleExternalLink(href);
                                    }
                                  }}
                                  onMouseEnter={() => setHoveredLink(href || null)}
                                  onMouseLeave={() => setHoveredLink(null)}
                                  className="text-primary hover:text-primary/80 underline cursor-pointer"
                                >
                                  {children}
                                </a>
                                {hoveredLink === href && (
                                  <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap pointer-events-none">
                                    {href}
                                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700"></div>
                                  </div>
                                )}
                              </span>
                            );
                          },
                        }}
                      >
                        {markdownContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500">
                      <p className="text-sm">No content to preview. Start writing to see a preview.</p>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  ref={markdownRef}
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder="Start writing your document in markdown..."
                  className="w-full h-80 p-4 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none font-mono text-sm"
                />
              )}
            </div>
          )}
          {mode === "external" && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconWorld className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    External Document
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Link to an external document or resource
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="https://docs.example.com"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Enter a valid HTTPS URL that will redirect users to the external document
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <IconTrash className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={form.handleSubmit(updateDoc)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff0099] hover:bg-[#ff0099]/95 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <IconCheck className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </FormProvider>
      </div>

      {showLinkModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-modal-title"
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden"
          >
            <div className="px-6 py-5 sm:px-8">
              <div className="flex items-start gap-4 mb-5">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#ff66b2] to-[#ff0099] flex items-center justify-center text-white shadow-md">
                    <IconLink className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 id="link-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Insert Link
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Add a link to your document
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Link Text
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Link text"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#ff0099]/40"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    URL
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#ff0099]/40"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && linkUrl.trim()) {
                        confirmLinkInsert();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={confirmLinkInsert}
                  disabled={!linkUrl.trim()}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#ff0099] hover:bg-[#ff0099]/95 text-white font-medium shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Insert Link
                </button>

                <button
                  type="button"
                  onClick={cancelLinkInsert}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100/90"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showExternalLinkModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="external-link-title"
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden"
          >
            <div className="px-6 py-5 sm:px-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md">
                    <IconAlertTriangle size={24} />
                  </div>
                </div>

                <div className="flex-1">
                  <h2 id="external-link-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    External Link Warning
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    This is a link submitted by a member in this workspace. Links are not verified by Planetary so please proceed at your own risk.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={proceedWithLink}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#ff0099] hover:bg-[#ff0099]/95 text-white font-medium shadow-md"
                >
                  <IconExternalLink size={18} />
                  Continue
                </button>

                <button
                  type="button"
                  onClick={cancelLink}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100/90"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Confirm Deletion
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
              Are you sure you want to delete this Document? This action cannot be
              undone.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

EditDoc.layout = Workspace;

export default EditDoc;
