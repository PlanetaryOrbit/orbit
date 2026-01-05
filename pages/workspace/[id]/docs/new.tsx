import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Button from "@/components/button";
import Input from "@/components/input";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useState, useRef } from "react";
import {
  IconCheck,
  IconH1,
  IconH2,
  IconH3,
  IconBold,
  IconItalic,
  IconListDetails,
  IconArrowLeft,
  IconFileText,
  IconLink,
  IconLock,
  IconEdit,
  IconWorld,
  IconEye,
  IconCode,
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
    const { id } = context.query;

    const roles = await prisma.role.findMany({
      where: {
        workspaceGroupId: Number(id),
      },
      orderBy: {
        isOwnerRole: "desc",
      },
    });

    const departments = await prisma.department.findMany({
      where: {
        workspaceGroupId: Number(id),
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      props: {
        roles,
        departments,
      },
    };
  },
  "create_docs"
);

const Home: pageWithLayout<InferGetServerSidePropsType<GetServerSideProps>> = ({
  roles,
  departments,
}) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const router = useRouter();
  const form = useForm();

  const [mode, setMode] = useState<"internal" | "external">("internal");
  const [showTypeModal, setShowTypeModal] = useState<boolean>(true);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showExternalLinkModal, setShowExternalLinkModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const markdownRef = useRef<HTMLTextAreaElement | null>(null);

  const goback = () => {
    window.history.back();
  };

  const chooseType = (t: "internal" | "external") => {
    setMode(t);
    setShowTypeModal(false);
  };

  const createDoc = async () => {
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
      .post(`/api/workspace/${workspace.groupId}/guides/create`, {
        name: form.getValues().name,
        content,
        roles: selectedRoles,
        departments: selectedDepartments,
      })
      .catch((err) => {
        form.setError("name", {
          type: "custom",
          message: err?.response?.data?.error || "Failed to create",
        });
      });
    if (!session) return;
    form.clearErrors();
    if (mode === "external") {
      toast.success("Document created!");
      router.push(`/workspace/${workspace.groupId}/docs`);
    } else {
      toast.success("Document created!");
      router.push(
        `/workspace/${workspace.groupId}/docs/${session.data.document.id}`
      );
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

  const toggleRole = async (role: string) => {
    setSelectedRoles((prevRoles) => {
      if (prevRoles.includes(role)) {
        return prevRoles.filter((r) => r !== role);
      } else {
        return [...prevRoles, role];
      }
    });
  };

  const toggleDepartment = async (departmentId: string) => {
    setSelectedDepartments((prevDepartments) => {
      if (prevDepartments.includes(departmentId)) {
        return prevDepartments.filter((d) => d !== departmentId);
      } else {
        return [...prevDepartments, departmentId];
      }
    });
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
              Create Document
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Create a new document for your workspace
            </p>
          </div>
        </div>
        <div
          className={`transition-opacity duration-150 ${
            showTypeModal ? "opacity-40 pointer-events-none select-none" : ""
          }`}
        >
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
                  <div className="space-y-2 mb-6">
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      Roles
                    </h3>
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

                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      Departments
                    </h3>
                    <div className="space-y-2">
                      {departments && departments.length > 0 ? (
                        departments.map((department: any) => (
                          <label
                            key={department.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-all group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDepartments.includes(department.id)}
                              onChange={() => toggleDepartment(department.id)}
                              className="w-4 h-4 text-primary rounded border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-primary/50 focus:ring-offset-0"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                              {department.name}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                          No departments available.
                        </p>
                      )}
                    </div>
                  </div>
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
                onClick={() => router.push(`/workspace/${workspace.groupId}/docs`)}
                className="px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={form.handleSubmit(createDoc)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff0099] hover:bg-[#ff0099]/95 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <IconCheck className="w-4 h-4" />
                Create Document
              </button>
            </div>
          </FormProvider>
        </div>
        {showTypeModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="doc-type-title"
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden"
            >
              <div className="px-6 py-5 sm:px-8">
                <div className="flex items-start gap-4 mb-5 relative">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#ff66b2] to-[#ff0099] flex items-center justify-center text-white shadow-md">
                      <IconFileText className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 id="doc-type-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Create a document
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      How would you like to create this document?
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/workspace/${workspace.groupId}/docs`)}
                    className="absolute top-0 right-0 p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    aria-label="Go back to documents"
                  >
                    <IconArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => chooseType("internal")}
                    className="flex items-center gap-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <IconFileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-white">Text Editor</div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">Create a document with markdown</div>
                    </div>
                  </button>
                  <button
                    onClick={() => chooseType("external")}
                    className="flex items-center gap-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <IconLink className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-white">Off-site Link</div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">Link to an external document</div>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

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
      </div>
    </div>
  );
};

Home.layout = Workspace;

export default Home;
