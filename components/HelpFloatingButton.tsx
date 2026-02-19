"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Menu, Dialog } from "@headlessui/react";
import {
  IconLifebuoy,
  IconBook,
  IconBrandGithub,
  IconBug,
  IconHistory,
  IconCopyright,
  IconX,
} from "@tabler/icons-react";
import sanitizeHtml from "sanitize-html";
import clsx from "clsx";
import packageJson from "../package.json";

type ChangelogEntry = { title: string; link: string; pubDate: string; content: string };

const CHANGELOG_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "img", "a", "strong", "em", "b", "i", "ul", "ol", "li", "h1", "h2", "h3", "h4", "blockquote", "span", "div"],
  allowedAttributes: { img: ["src", "alt", "width", "height"], a: ["href", "target", "rel"] },
  allowedSchemes: ["https", "http"],
};

const HelpContext = createContext<{
  openChangelog: () => void;
  openCopyright: () => void;
}>({ openChangelog: () => {}, openCopyright: () => {} });

export function useHelp() {
  return useContext(HelpContext);
}

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [showChangelog, setShowChangelog] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);

  const openChangelog = useCallback(() => setShowChangelog(true), []);
  const openCopyright = useCallback(() => setShowCopyright(true), []);

  useEffect(() => {
    if (!showChangelog) return;
    setChangelogLoading(true);
    fetch("/api/changelog")
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.items ?? [];
        setChangelog(Array.isArray(items) ? items : []);
      })
      .catch(() => setChangelog([]))
      .finally(() => setChangelogLoading(false));
  }, [showChangelog]);

  return (
    <HelpContext.Provider value={{ openChangelog, openCopyright }}>
      {children}

      <Dialog open={showCopyright} onClose={() => setShowCopyright(false)} className="relative z-[99999]">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg rounded-2xl bg-white dark:bg-zinc-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
                © Copyright Notices
              </Dialog.Title>
              <button
                onClick={() => setShowCopyright(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <IconX className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">Orbit</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">© 2025 Planetary — All rights reserved.</p>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-700 my-4" />
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">Original Tovy Project</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">© 2022 Tovy — All rights reserved.</p>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={showChangelog} onClose={() => setShowChangelog(false)} className="relative z-[99999]">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg rounded-2xl bg-white dark:bg-zinc-800 p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">Changelog</Dialog.Title>
              <button
                onClick={() => setShowChangelog(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <IconX className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto flex-1 min-h-0">
              {changelogLoading && <p className="text-sm text-zinc-500">Loading...</p>}
              {!changelogLoading && changelog.length === 0 && <p className="text-sm text-zinc-500">No entries found.</p>}
              {!changelogLoading &&
                changelog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      "pb-6",
                      idx < changelog.length - 1 && "border-b border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    <a
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      {entry.title}
                    </a>
                    <div className="text-xs text-zinc-400 mt-1 mb-3">{entry.pubDate}</div>
                    <div
                      className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2 prose-img:rounded-lg prose-img:max-w-full"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(entry.content || "", CHANGELOG_HTML_OPTIONS),
                      }}
                    />
                  </div>
                ))}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </HelpContext.Provider>
  );
}

export function HelpFloatingButton() {
  const { openChangelog, openCopyright } = useHelp();

  return (
    <Menu as="div" className="fixed bottom-6 right-6 z-[99998]">
      <Menu.Button
        className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-600/80 text-zinc-500 dark:text-zinc-400 hover:text-[color:rgb(var(--group-theme))] hover:border-[color:rgb(var(--group-theme)/0.3)] hover:bg-white dark:hover:bg-zinc-700/90 transition-all duration-200 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--group-theme)/0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-900"
        title="Help & resources"
      >
        <IconLifebuoy className="w-6 h-6" stroke={1.5} />
      </Menu.Button>
      <Menu.Items
        className={clsx(
          "absolute right-0 bottom-full mb-2 w-56 rounded-2xl bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200/80 dark:border-zinc-600/80 py-2.5 focus:outline-none z-50",
          "ring-1 ring-black/5 dark:ring-white/5"
        )}
      >
        <div className="px-4 pb-2.5 pt-0.5">
          <p className="text-xs font-semibold text-zinc-900 dark:text-white tracking-tight">Orbit</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">v{packageJson.version}</p>
        </div>
        <div className="h-px bg-zinc-200/80 dark:bg-zinc-600/80 mx-3 mb-2" />
        <a
          href="https://docs.planetaryapp.us"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-colors"
        >
          <IconBook className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
          <span>Documentation</span>
        </a>
        <a
          href="https://github.com/planetaryorbit/orbit"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-colors"
        >
          <IconBrandGithub className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
          <span>GitHub</span>
        </a>
        <a
          href="https://feedback.planetaryapp.us/bugs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-colors"
        >
          <IconBug className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
          <span>Bug Reports</span>
        </a>
        <Menu.Item>
          {({ active }) => (
            <button
              onClick={() => openChangelog()}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 transition-colors text-left",
                active && "bg-zinc-100 dark:bg-zinc-700/70"
              )}
            >
              <IconHistory className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
              <span>Changelog</span>
            </button>
          )}
        </Menu.Item>
        <div className="h-px bg-zinc-200/80 dark:bg-zinc-600/80 mx-3 my-2" />
        <Menu.Item>
          {({ active }) => (
            <button
              onClick={() => openCopyright()}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 transition-colors text-left",
                active && "bg-zinc-100 dark:bg-zinc-700/70"
              )}
            >
              <IconCopyright className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
              <span>Copyright Notices</span>
            </button>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}

export default HelpFloatingButton;
