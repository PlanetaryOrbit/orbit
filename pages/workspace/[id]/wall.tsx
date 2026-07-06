import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Workspace from "@/layouts/workspace";
import { useState, useRef, useEffect, Fragment } from "react";
import { useRecoilState } from "recoil";
import { GetServerSideProps } from "next";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import type { wallPost } from "@prisma/client";
import moment from "moment";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import axios from "axios";
import { Dialog, Transition } from "@headlessui/react";
import {
  IconSend,
  IconPhoto,
  IconMoodSmile,
  IconX,
  IconTrash,
  IconInbox,
  IconMessageCircle,
} from "@tabler/icons-react";
import clsx from "clsx";
import EmojiPicker, { Theme } from "emoji-picker-react";
import sanitizeHtml from "sanitize-html";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { AuthenticatedRequest } from "@/lib/withAuth";

const SANITIZE_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "recursiveEscape" as const,
};

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async ({ query, req }) => {
    const posts = await prisma.wallPost.findMany({
      where: {
        workspaceGroupId: parseInt(query.id as string),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: {
          select: {
            username: true,
            picture: true,
            ranks: true,
          },
        },
      },
    });

    const authReq = req as AuthenticatedRequest;

    const user = await prisma.user.findUnique({
      where: { userid: authReq.auth.userId },
      include: {
        roles: {
          where: { workspaceGroupId: parseInt(query.id as string) },
          orderBy: { isOwnerRole: "desc" },
        },
      },
    });

    const userPermissions = user?.roles?.[0]?.permissions || [];

    return {
      props: {
        posts: JSON.parse(
          JSON.stringify(posts, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ) as typeof posts,
        userPermissions,
      },
    };
  }
);

type pageProps = {
  posts: wallPost[];
  userPermissions: string[];
};

const Wall: pageWithLayout<pageProps> = (props) => {
  const router = useRouter();
  const { id } = router.query;

  const [login, setLogin] = useRecoilState(loginState);
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [wallMessage, setWallMessage] = useState("");
  const [posts, setPosts] = useState(props.posts);
  const userPermissions = props.userPermissions;
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<number | null>(null);

  useEffect(() => {
    if (!showDeleteModal && postToDelete !== null) {
      const t = setTimeout(() => setPostToDelete(null), 300);
      return () => clearTimeout(t);
    }
  }, [showDeleteModal, postToDelete]);

  useEffect(() => {
    if (typeof window !== "undefined" && props.posts.length > 0) {
      const sanitizedPosts = props.posts.map((post) => ({
        ...post,
        content:
          typeof post.content === "string"
            ? sanitizeHtml(post.content, SANITIZE_OPTIONS)
            : post.content,
        image: typeof post.image === "string" ? post.image : null,
      }));
      setPosts(sanitizedPosts);
    }
  }, [props.posts]);

  const confirmDelete = async () => {
    if (!postToDelete) return;

    try {
      await axios.delete(`/api/workspace/${id}/wall/${postToDelete}/delete`);
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete));
      toast.success("Post deleted");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to delete post");
    } finally {
      setShowDeleteModal(false);
      setPostToDelete(null);
    }
  };

  function sendPost() {
    if (!canPostOnWall()) {
      toast.error("You don't have permission to post on the wall.");
      return;
    }

    setLoading(true);
    axios
      .post(`/api/workspace/${id}/wall/post`, {
        content: wallMessage,
        image: selectedImage,
      })
      .then((req) => {
        toast.success("Wall message posted!");
        setWallMessage("");
        setSelectedImage(null);
        setPosts([req.data.post, ...posts]);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error(
          error.response?.data?.error || "Could not post wall message."
        );
        setLoading(false);
      });
  }

  const onEmojiClick = (emojiObject: any) => {
    setWallMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Invalid file type. Only JPEG, PNG, GIF, and WEBP are supported."
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 5MB.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (typeof result === "string" && result.startsWith("data:image/")) {
        setSelectedImage(result);
      } else {
        toast.error("Invalid image format.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const BG_COLORS = [
    "bg-rose-300",
    "bg-lime-300",
    "bg-teal-200",
    "bg-amber-300",
    "bg-rose-200",
    "bg-lime-200",
    "bg-green-100",
    "bg-red-100",
    "bg-yellow-200",
    "bg-amber-200",
    "bg-emerald-300",
    "bg-green-300",
    "bg-red-300",
    "bg-emerald-200",
    "bg-green-200",
    "bg-red-200",
  ];

  function getRandomBg(userid: string, username?: string) {
    const key = `${userid ?? ""}:${username ?? ""}`;
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
    }
    const index = (hash >>> 0) % BG_COLORS.length;
    return BG_COLORS[index];
  }

  const canPostOnWall = () => {
    try {
      const role = workspace?.roles?.find(
        (r: any) => r.id === workspace?.yourRole
      );
      const isOwner = !!(role && role.isOwnerRole);
      const hasPerm = !!workspace?.yourPermission?.includes("post_on_wall");
      return isOwner || hasPerm || !!login?.canMakeWorkspace;
    } catch (e) {
      return false;
    }
  };

  const canAddPhotos = () => {
    try {
      const role = workspace?.roles?.find(
        (r: any) => r.id === workspace?.yourRole
      );
      const isOwner = !!(role && role.isOwnerRole);
      const hasPerm = !!workspace?.yourPermission?.includes("add_wall_photos");
      return isOwner || hasPerm || !!login?.canMakeWorkspace;
    } catch (e) {
      return false;
    }
  };

  const iconButtonClass =
    "p-2.5 text-zinc-500 dark:text-zinc-400 rounded-xl hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors";

  return (
    <div className="pagePadding">
      <div className="mx-auto max-w-3xl space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Group Wall
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Share updates and announcements with your team
          </p>
        </div>

        {canPostOnWall() ? (
          <div className="rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-800/60">
            <div className="flex items-start gap-3">
              <div className={clsx("h-9 w-9 shrink-0 overflow-hidden rounded-full", getRandomBg(login.userId.toString()))}>
                <img src={login.thumbnail} alt="Your avatar" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <textarea
                  className="w-full resize-none border-0 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-0 dark:text-white dark:placeholder-zinc-500"
                  placeholder="What's on your mind?"
                  value={wallMessage}
                  onChange={(e) => setWallMessage(e.target.value)}
                  rows={3}
                  maxLength={10000}
                />
                {selectedImage && (
                  <div className="relative mt-2">
                    <img
                      src={selectedImage}
                      alt="Selected"
                      className="max-h-56 w-full rounded-xl bg-zinc-200 object-contain dark:bg-zinc-700"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                    >
                      <IconX size={14} stroke={2} />
                    </button>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-700/60">
                  <div className="flex items-center gap-0.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageSelect}
                    />
                    {canAddPhotos() && (
                      <button className={iconButtonClass} onClick={() => fileInputRef.current?.click()} type="button">
                        <IconPhoto size={18} stroke={1.5} />
                      </button>
                    )}
                    <div className="relative z-10">
                      <button type="button" className={iconButtonClass} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                        <IconMoodSmile size={18} stroke={1.5} />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute left-0 top-full z-20 mt-2 overflow-hidden rounded-xl shadow-lg">
                          <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            theme={document.documentElement.classList.contains("dark") ? Theme.DARK : Theme.LIGHT}
                            width={320}
                            height={380}
                            lazyLoadEmojis
                            searchPlaceholder="Search emojis…"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={sendPost}
                    disabled={loading || (!wallMessage.trim() && !selectedImage)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <IconSend size={16} stroke={1.75} />
                    )}
                    {loading ? "Posting…" : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-zinc-100 px-5 py-4 dark:bg-zinc-800/60">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              You don't have permission to post on the wall.
            </p>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/60">
              <IconInbox className="h-5 w-5 text-zinc-400 dark:text-zinc-500" stroke={1.75} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No posts yet</p>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                Be the first to share something with your team.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => {
              const isAuthor = String(post.authorId) === String(login.userId);
              const canDelete = isAuthor || userPermissions.includes("delete_wall_posts");
              return (
                <div key={post.id} className="rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-800/60">
                  <div className="flex items-start gap-3">
                    <div className={clsx("h-9 w-9 shrink-0 overflow-hidden rounded-full", getRandomBg(post.authorId))}>
                      <img alt={post.author.username} src={post.author.picture} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {post.author.username}
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {moment(post.createdAt).format("D MMM YYYY [at] h:mm A")}
                          </p>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => { setPostToDelete(post.id); setShowDeleteModal(true); }}
                            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-500"
                            aria-label="Delete post"
                          >
                            <IconTrash size={16} stroke={1.5} />
                          </button>
                        )}
                      </div>
                      <div className="prose prose-sm mt-2.5 max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200">
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                          {post.content}
                        </ReactMarkdown>
                      </div>
                      {post.image && (
                        <div className="mt-3">
                          <img
                            src={post.image}
                            alt=""
                            className="w-full max-h-96 rounded-xl object-contain bg-zinc-200 dark:bg-zinc-700"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder-image-error.png";
                              toast.error("Failed to load image");
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {postToDelete !== null && (
          <Transition appear show={showDeleteModal} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setShowDeleteModal(false)}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
              </Transition.Child>
              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-center shadow-2xl transition-all dark:bg-zinc-900">
                      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10">
                        <IconTrash className="h-5 w-5 text-red-500" stroke={1.75} />
                      </div>
                      <Dialog.Title as="h3" className="mb-1 text-base font-semibold text-zinc-900 dark:text-white">
                        Delete post
                      </Dialog.Title>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        This action cannot be undone.
                      </p>
                      <div className="mt-5 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowDeleteModal(false)}
                          className="flex-1 rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={confirmDelete}
                          className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>
        )}

      </div>
    </div>
  );
};

Wall.layout = Workspace;

export default Wall;