import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Workspace from "@/layouts/workspace";
import { useState, useRef, useEffect } from "react";
import { useRecoilState } from "recoil";
import Button from "@/components/button";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import type { wallPost } from "@prisma/client";
import moment from "moment";
import { withSessionSsr } from "@/lib/withSession";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/router";
import axios from "axios";
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

    const user = await prisma.user.findUnique({
      where: { userid: req.session.userid },
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
    "p-2.5 text-zinc-500 dark:text-zinc-400 rounded-xl hover:text-[color:rgb(var(--group-theme))] hover:bg-[color:rgb(var(--group-theme)/0.1)] dark:hover:bg-[color:rgb(var(--group-theme)/0.15)] transition-colors";

  return (
    <div className="pagePadding">
      <Toaster position="bottom-center" />

      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))] shrink-0">
          <IconMessageCircle className="w-6 h-6" stroke={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
            Group Wall
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Share updates and announcements with your team
          </p>
        </div>
      </div>

      {canPostOnWall() ? (
        <div className="bg-white dark:bg-zinc-800/80 dark:border dark:border-zinc-700/50 rounded-2xl shadow-sm shadow-zinc-200/50 dark:shadow-none p-5 sm:p-6 mb-8">
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white dark:ring-zinc-800",
                getRandomBg(login.userId.toString())
              )}
            >
              <img
                src={login.thumbnail}
                alt="Your avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                className={clsx(
                  "w-full border-0 focus:ring-0 resize-none bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500",
                  "focus:outline-none text-sm sm:text-base"
                )}
                placeholder="What's on your mind?"
                value={wallMessage}
                onChange={(e) => setWallMessage(e.target.value)}
                rows={3}
                maxLength={10000}
              />
              {selectedImage && (
                <div className="relative mt-3">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="max-h-64 rounded-xl object-contain bg-zinc-100 dark:bg-zinc-900/50"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                  >
                    <IconX size={16} stroke={2} />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-200/80 dark:border-zinc-700/80">
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageSelect}
                  />
                  {canAddPhotos() && (
                    <button
                      className={iconButtonClass}
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <IconPhoto size={20} stroke={1.5} />
                    </button>
                  )}
                  <div className="relative z-10">
                    <button
                      type="button"
                      className={iconButtonClass}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <IconMoodSmile size={20} stroke={1.5} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-2 z-20 rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-700">
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          theme={
                            document.documentElement.classList.contains("dark")
                              ? Theme.DARK
                              : Theme.LIGHT
                          }
                          width={350}
                          height={400}
                          lazyLoadEmojis={true}
                          searchPlaceholder="Search emojis..."
                        />
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  workspace
                  onPress={sendPost}
                  loading={loading}
                  disabled={!wallMessage.trim() && !selectedImage}
                >
                  <span className="inline-flex items-center gap-2">
                    <IconSend size={18} stroke={1.5} />
                    Post
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800/80 dark:border dark:border-zinc-700/50 rounded-2xl shadow-sm p-5 sm:p-6 mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          You don't have permission to post on the wall.
        </div>
      )}

      <div className="space-y-4">
        {posts.length < 1 ? (
          <div className="bg-white dark:bg-zinc-800/80 dark:border dark:border-zinc-700/50 rounded-2xl shadow-sm p-10 sm:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[color:rgb(var(--group-theme)/0.12)] flex items-center justify-center text-[color:rgb(var(--group-theme))]">
              <IconInbox className="w-8 h-8" stroke={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
              No posts yet
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Be the first to share something with your team!
            </p>
          </div>
        ) : (
          posts.map((post: any) => (
            <div
              key={post.id}
              className="bg-white dark:bg-zinc-800/80 dark:border dark:border-zinc-700/50 rounded-2xl shadow-sm shadow-zinc-200/50 dark:shadow-none p-5 sm:p-6 hover:shadow-md dark:hover:shadow-none transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div
                  className={clsx(
                    "w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white dark:ring-zinc-800",
                    getRandomBg(post.authorId)
                  )}
                >
                  <img
                    alt="avatar headshot"
                    src={post.author.picture}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {post.author.username}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {moment(post.createdAt).format(
                          "MMMM D, YYYY [at] h:mm A"
                        )}
                      </p>
                    </div>
                    {(() => {
                      const isAuthor =
                        String(post.authorId) === String(login.userId);
                      const hasManageWall =
                        userPermissions.includes("delete_wall_posts");
                      const canDelete = isAuthor || hasManageWall;

                      return canDelete ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPostToDelete(post.id);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                        >
                          <IconTrash size={18} stroke={1.5} />
                        </button>
                      ) : null;
                    })()}
                  </div>
                  <div className="prose prose-sm text-zinc-800 dark:text-zinc-200 dark:prose-invert max-w-none mt-3">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                      {post.content}
                    </ReactMarkdown>
                  </div>
                  {post.image && (
                    <div className="mt-4">
                      <img
                        src={post.image}
                        alt="Post image"
                        className="max-h-96 rounded-xl object-contain bg-zinc-100 dark:bg-zinc-900/50"
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
          ))
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 p-6 w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Delete post?
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
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

Wall.layout = Workspace;

export default Wall;
