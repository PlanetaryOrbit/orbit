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
} from "@tabler/icons-react";
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

  // Sanitize posts on client-side as an extra layer of security
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

    // Validate file type
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

    // Validate file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
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
    "bg-red-200",
    "bg-green-200",
    "bg-emerald-200",
    "bg-red-300",
    "bg-green-300",
    "bg-emerald-300",
    "bg-amber-200",
    "bg-yellow-200",
    "bg-red-100",
    "bg-green-100",
    "bg-lime-200",
    "bg-rose-200",
    "bg-amber-300",
    "bg-teal-200",
    "bg-lime-300",
    "bg-rose-300",
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

  return (
    <div className="pagePadding">
      <Toaster position="bottom-center" />

      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-medium text-zinc-900 dark:text-white">
            Group Wall
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Share updates and announcements with your team
          </p>
        </div>
      </div>

      {canPostOnWall() ? (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 mb-8">
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${getRandomBg(
                login.userId.toString()
              )}`}
            >
              <img
                src={login.thumbnail}
                alt="Your avatar"
                className="w-10 h-10 rounded-full object-cover border-2 border-white"
                style={{ background: "transparent" }}
              />
            </div>
            <div className="flex-1">
              <textarea
                className="w-full border-0 focus:ring-0 resize-none bg-transparent placeholder-gray-400 dark:placeholder-gray-500 text-zinc-900 dark:text-white"
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
                    className="max-h-64 rounded-lg object-contain"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <IconX size={16} />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageSelect}
                  />
                  <button
                    className="p-2 text-zinc-500 hover:text-primary rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconPhoto size={20} />
                  </button>
                  <div className="relative z-10">
                    <button
                      className="p-2 text-zinc-500 hover:text-primary rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <IconMoodSmile size={20} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-2 z-10">
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
                  classoverride="bg-primary hover:bg-primary/90 text-white dark:text-white px-6 dark:bg-primary dark:hover:bg-primary/80"
                  workspace
                  onPress={sendPost}
                  loading={loading}
                  disabled={!wallMessage.trim() && !selectedImage}
                >
                  <IconSend size={18} className="mr-2" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          You don't have permission to post on the wall.
        </div>
      )}

      <div className="space-y-6">
        {posts.length < 1 ? (
          <div className="bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <IconInbox className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
              No posts yet
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              Be the first to share something with your team!
            </p>
          </div>
        ) : (
          posts.map((post: any) => (
            <div
              key={post.id}
              className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${getRandomBg(
                    post.authorId
                  )}`}
                >
                  <img
                    alt="avatar headshot"
                    src={post.author.picture}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white"
                    style={{ background: "transparent" }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {post.author.username}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {moment(post.createdAt).format(
                          "MMMM D, YYYY [at] h:mm A"
                        )}
                      </p>
                    </div>
                    {(() => {
                      const isAuthor = String(post.authorId) === String(login.userId);
                      const hasManageWall = userPermissions.includes("manage_wall");
                      const canDelete = isAuthor || hasManageWall;
                      
                      return canDelete ? (
                        <button
                          onClick={() => {
                            setPostToDelete(post.id);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <IconTrash size={18} />
                        </button>
                      ) : null;
                    })()}
                  </div>
                  <div className="prose text-zinc-800 dark:text-zinc-200 dark:prose-invert max-w-none mt-3">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                      {post.content}
                    </ReactMarkdown>
                  </div>
                  {post.image && (
                    <div className="mt-4">
                      <img
                        src={post.image}
                        alt="Post image"
                        className="max-h-96 rounded-lg object-contain"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Confirm Deletion
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
              Are you sure you want to delete this post? This action cannot be
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

Wall.layout = Workspace;

export default Wall;
