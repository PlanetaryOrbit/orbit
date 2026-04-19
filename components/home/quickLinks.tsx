import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { IconChevronRight, IconDeviceGamepad } from "@tabler/icons-react";
import clsx from "clsx";
import { CogIcon } from "@heroicons/react/24/outline";

interface GroupLink {
  id: number;
  name: string;
  thumbnailUrl: string;
  rootPlace: { id: number; type: string };
}

export default function QuickLinks() {
  const [quickLinks, setQuickLinks] = useState<GroupLink[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady || !router.query.id) return;

    async function fetchQLs() {
      try {
        setLoading(true);
        const response = await axios.get(`/api/workspace/${router.query.id}/home/quickLinks`);
        setQuickLinks(response.data.experiences ?? []);
      } catch {
        setQuickLinks([]);
      } finally {
        setLoading(false);
      }
    }

    fetchQLs();
  }, [router.isReady, router.query.id]);

  const pushCreate = () => router.push("https://create.roblox.com");
  const pushGame = (id: number) => router.push(`https://www.roblox.com/games/${id}/`);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0 text-pink-500">
            <CogIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Quick Links</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              All public games you have access to
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quickLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <IconDeviceGamepad className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-zinc-900 dark:text-white mb-1">No games yet</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Post some games in order to appear here
            </p>
            <button
              onClick={pushCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go to Create
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickLinks.map((post) => (
              <button
                type="button"
                key={post.id}
                onClick={() => pushGame(post.rootPlace.id)}
                className={clsx(
                  "group text-left overflow-hidden rounded-xl transition-[box-shadow,transform] duration-300 relative w-full",
                  "bg-white dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/60",
                  "shadow-sm hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-none hover:-translate-y-0.5",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                  "focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950"
                )}
              >
                <div className="relative overflow-hidden rounded-[inherit] aspect-video">
                  <img
                    src={post.thumbnailUrl || "/favicon-32x32.png"}
                    alt={post.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 flex items-end justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-sm">
                      {post.name}
                    </h3>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm text-white group-hover:bg-primary group-hover:scale-110 transition-all duration-300 shrink-0">
                      <IconChevronRight className="w-3.5 h-3.5" stroke={2} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}