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
  IconArrowLeft,
} from "@tabler/icons";
import EmojiPicker, { Theme } from "emoji-picker-react";
import sanitizeHtml from "sanitize-html";

// Client-side sanitization options
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
          },
        },
      },
    });

    return {
      props: {
        posts: JSON.parse(
          JSON.stringify(posts, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ) as typeof posts,
      },
    };
  }
);

type pageProps = {
  posts: wallPost[];
};

const Wall: pageWithLayout<pageProps> = (props) => {
  const router = useRouter();
  const { id } = router.query;

  const [login, setLogin] = useRecoilState(loginState);
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [wallMessage, setWallMessage] = useState("");
  const [posts, setPosts] = useState(props.posts);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function sendPost() {
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
      // Validate that the result is actually an image data URL
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

  return (
    <div className="pagePadding">
      <Toaster position="bottom-center" />

      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-white">
            Group Wall
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Share updates and announcements with your team
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-8">
        <div className="flex items-start gap-4">
          <img
            src={login.thumbnail}
            alt="Your avatar"
            className="w-10 h-10 rounded-full bg-primary flex-shrink-0"
          />
          <div className="flex-1">
            <textarea
              className="w-full border-0 focus:ring-0 resize-none bg-transparent placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
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
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect}
                />
                <button
                  className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconPhoto size={20} />
                </button>
                <div className="relative z-10">
                  <button
                    className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                classoverride="bg-primary hover:bg-primary/90 text-white dark:text-white px-6 dark:bg-[var(--group-theme)] dark:hover:bg-[var(--group-theme)]/60"
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

      <div className="space-y-6">
        {posts.length < 1 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            <img
              className="mx-auto h-48 mb-4"
              alt="No posts yet"
              src="/conifer-charging-the-battery-with-a-windmill.png"
            />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Be the first to share something with your team!
            </p>
          </div>
        ) : (
          posts.map((post: any) => (
            <div
              key={post.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <img
                  alt="avatar headshot"
                  src={post.author.picture}
                  className="w-12 h-12 rounded-full bg-primary flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {post.author.username}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {moment(post.createdAt).format(
                          "MMMM D, YYYY [at] h:mm A"
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
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
    </div>
  );
};

Wall.layout = Workspace;

export default Wall;
