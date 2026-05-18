import axios from "axios";
import React, { useState } from "react";
import type { wallPost, user } from "@/utils/database";
import { useRouter } from "next/router";
import moment from "moment";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { HomeEmpty, HomeList, HomeListItem } from "@/components/home/shell";

const Wall: React.FC = () => {
  const [posts, setPosts] = useState<(wallPost & { author: user })[]>([]);
  const router = useRouter();
  const workspaceId = router.query.id as string;

  React.useEffect(() => {
    if (!workspaceId) return;
    axios.get(`/api/workspace/${workspaceId}/home/wall`).then((res) => {
      if (res.status === 200) setPosts(res.data.posts);
    });
  }, [workspaceId]);

  if (posts.length === 0) {
    return (
      <HomeEmpty
        action={{
          label: "Go to wall",
          onClick: () => router.push(`/workspace/${workspaceId}/wall`),
        }}
      >
        No posts yet.
      </HomeEmpty>
    );
  }

  return (
    <HomeList>
      {posts.slice(0, 2).map((post) => (
        <HomeListItem key={post.id}>
          <div className="flex items-start gap-3">
            <img
              alt=""
              src={String(post.author.picture)}
              className="h-9 w-9 shrink-0 rounded-md object-cover bg-zinc-100 dark:bg-zinc-700"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {post.author.username}
                </p>
                <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {moment(post.createdAt).format("MMM D")}
                </span>
              </div>
              <div className="prose prose-sm prose-zinc dark:prose-invert mt-1 max-w-none line-clamp-3 [&_p]:my-0">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{post.content}</ReactMarkdown>
              </div>
              {post.image && (
                <img
                  src={post.image}
                  alt=""
                  className="mt-2 max-h-36 w-full rounded-md object-cover"
                />
              )}
            </div>
          </div>
        </HomeListItem>
      ))}
    </HomeList>
  );
};

export default Wall;
