"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Menu, Dialog } from "@headlessui/react";
import {
  IconLifebuoy,
  IconBook,
  IconBrandGithub,
  IconBug,
  IconHistory,
  IconX,
  IconLicense,
} from "@tabler/icons-react";
import { marked } from "marked";
import clsx from "clsx";

type ChangelogRelease = {
  version: string;
  date: string;
  changes: string[];
};

type VersionResponse = {
  current: string;
  latest: string | null;
  outdated: boolean;
  changelog: ChangelogRelease[];
};

type HelpContextValue = {
  openChangelog: () => void;
  openCopyright: () => void;
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  changelog: ChangelogRelease[];
  versionLoading: boolean;
};

const HelpContext = createContext<HelpContextValue>({
  openChangelog: () => {},
  openCopyright: () => {},
  currentVersion: "",
  latestVersion: null,
  updateAvailable: false,
  changelog: [],
  versionLoading: true,
});

export function useHelp() {
  return useContext(HelpContext);
}

const menuItemClasses = clsx(
  "w-full flex items-center gap-3",
  "px-4 py-2.5",
  "text-left text-sm font-normal",
  "text-zinc-600 dark:text-zinc-300",
  "transition-colors duration-150",
  "hover:bg-zinc-100 dark:hover:bg-zinc-700/70",
  "focus:outline-none",
);

const menuIconClasses = "h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500";

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [showChangelog, setShowChangelog] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);

  const [currentVersion, setCurrentVersion] = useState("");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [changelog, setChangelog] = useState<ChangelogRelease[]>([]);
  const [versionLoading, setVersionLoading] = useState(true);

  const openChangelog = useCallback(() => {
    setShowChangelog(true);
  }, []);

  const openCopyright = useCallback(() => {
    setShowCopyright(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchVersion() {
      try {
        const response = await fetch("/api/version", {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Version API returned ${response.status}`);
        }

        const data = (await response.json()) as VersionResponse;

        setCurrentVersion(data.current);
        setLatestVersion(data.latest);
        setUpdateAvailable(data.outdated);
        setChangelog(Array.isArray(data.changelog) ? data.changelog : []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("[HELP] Failed to fetch Orbit version:", error);
      } finally {
        if (!controller.signal.aborted) {
          setVersionLoading(false);
        }
      }
    }

    fetchVersion();

    return () => controller.abort();
  }, []);

  return (
    <HelpContext.Provider
      value={{
        openChangelog,
        openCopyright,
        currentVersion,
        latestVersion,
        updateAvailable,
        changelog,
        versionLoading,
      }}
    >
      {children}

      <Dialog
        open={showCopyright}
        onClose={() => setShowCopyright(false)}
        className="relative z-[99999]"
      >
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
          aria-hidden="true"
        />

        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Panel
            className={clsx(
              "w-full max-w-lg",
              "rounded-2xl",
              "bg-white dark:bg-zinc-800",
              "p-6",
              "shadow-xl",
              "ring-1 ring-black/5 dark:ring-white/5",
              "focus:outline-none",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-white">
                Copyright & Licensing
              </Dialog.Title>

              <button
                type="button"
                onClick={() => setShowCopyright(false)}
                className={clsx(
                  "shrink-0 rounded-lg p-1.5",
                  "text-zinc-400 dark:text-zinc-500",
                  "hover:bg-zinc-100 hover:text-zinc-600",
                  "dark:hover:bg-zinc-700 dark:hover:text-zinc-200",
                  "focus:outline-none focus-visible:ring-2",
                  "focus-visible:ring-[color:rgb(var(--group-theme)/0.5)]",
                  "transition-colors",
                )}
                aria-label="Close copyright and licensing dialog"
              >
                <IconX className="h-5 w-5" stroke={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <section
                aria-labelledby="orbit-license-title"
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3
                      id="orbit-license-title"
                      className="text-sm font-semibold text-zinc-900 dark:text-white"
                    >
                      Orbit
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      © 2025–2026 Planetary
                    </p>
                  </div>

                  <span
                    aria-label="Licensed under GPL version 3"
                    className="shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300"
                  >
                    GPL-3.0
                  </span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Orbit is free and open-source software licensed under the GNU
                  General Public License v3.0.
                </p>

                <a
                  href="https://github.com/PlanetaryOrbit/orbit/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={clsx(
                    "inline-flex mt-3 rounded-md",
                    "text-sm font-medium text-primary",
                    "hover:underline",
                    "focus:outline-none focus-visible:ring-2",
                    "focus-visible:ring-[color:rgb(var(--group-theme)/0.5)]",
                    "focus-visible:ring-offset-2",
                    "dark:focus-visible:ring-offset-zinc-800",
                  )}
                >
                  View license
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </section>

              <section
                aria-labelledby="tovy-license-title"
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4"
              >
                <h3
                  id="tovy-license-title"
                  className="text-sm font-semibold text-zinc-900 dark:text-white"
                >
                  Original Tovy Project
                </h3>

                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  © 2023 Tovy
                </p>

                <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Orbit is based on the original Tovy project. Portions of the
                  project retain their original copyright notices.
                </p>
              </section>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
              Copyright notices and license information for third-party software
              used by Orbit may be included in the project repository.
            </p>
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog
        open={showChangelog}
        onClose={() => setShowChangelog(false)}
        className="relative z-[99999]"
      >
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
          aria-hidden="true"
        />

        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Panel
            className={clsx(
              "flex w-full max-w-lg flex-col",
              "max-h-[min(90vh,48rem)]",
              "rounded-2xl",
              "bg-white dark:bg-zinc-800",
              "shadow-xl",
              "ring-1 ring-black/5 dark:ring-white/5",
              "focus:outline-none",
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 p-6 pb-5">
              <div className="min-w-0">
                <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Changelog
                </Dialog.Title>

                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Recent Orbit releases
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowChangelog(false)}
                className={clsx(
                  "shrink-0 rounded-lg p-1.5",
                  "text-zinc-400 dark:text-zinc-500",
                  "hover:bg-zinc-100 hover:text-zinc-600",
                  "dark:hover:bg-zinc-700 dark:hover:text-zinc-200",
                  "focus:outline-none focus-visible:ring-2",
                  "focus-visible:ring-[color:rgb(var(--group-theme)/0.5)]",
                  "transition-colors",
                )}
                aria-label="Close changelog dialog"
              >
                <IconX
                  className="h-5 w-5"
                  stroke={1.75}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div
              className={clsx(
                "min-h-0 flex-1 overflow-y-auto",
                "px-6 pb-6",
                "overscroll-contain",
                "scrollbar-thin",
              )}
              aria-live="polite"
              aria-busy={versionLoading}
            >
              {versionLoading && (
                <div
                  className="flex items-center gap-3 py-6"
                  role="status"
                  aria-label="Loading changelog"
                >
                  <span
                    className={clsx(
                      "h-4 w-4 shrink-0 animate-spin rounded-full border-2",
                      "border-zinc-300 border-t-zinc-600",
                      "dark:border-zinc-600 dark:border-t-zinc-300",
                    )}
                    aria-hidden="true"
                  />

                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Loading changelog…
                  </span>
                </div>
              )}

              {!versionLoading && changelog.length === 0 && (
                <div className="py-6">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No changelog entries are currently available.
                  </p>
                </div>
              )}

              {!versionLoading && changelog.length > 0 && (
                <div className="space-y-4">
                  {changelog.map((release, index) => (
                    <article
                      key={`${release.version}-${release.date}`}
                      className={clsx(
                        "rounded-xl border border-zinc-200 p-4",
                        "dark:border-zinc-700",
                      )}
                      aria-labelledby={`release-${release.version}`}
                    >
                      <header className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3
                            id={`release-${release.version}`}
                            className="text-sm font-semibold text-zinc-900 dark:text-white"
                          >
                            {release.version}
                          </h3>

                          <time
                            dateTime={release.date}
                            className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500"
                          >
                            {release.date}
                          </time>
                        </div>
                      </header>

                      <div
                        className={clsx(
                          "prose prose-sm mt-3 max-w-none",
                          "prose-zinc dark:prose-invert",
                          "prose-p:my-2",
                          "prose-ul:my-2",
                          "prose-ol:my-2",
                          "prose-li:my-0.5",
                          "prose-headings:my-3",
                          "prose-a:font-medium prose-a:text-primary",
                          "prose-a:underline-offset-2",
                          "prose-a:hover:underline",
                          "prose-a:focus:outline-none",
                          "prose-a:focus-visible:ring-2",
                          "prose-a:focus-visible:ring-[color:rgb(var(--group-theme)/0.5)]",
                          "prose-a:focus-visible:rounded-sm",
                        )}
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(
                            release.changes
                              .map((change) => `- ${change}`)
                              .join("\n"),
                          ),
                        }}
                      />
                    </article>
                  ))}
                </div>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </HelpContext.Provider>
  );
}

export function HelpFloatingButton() {
  const {
    openChangelog,
    openCopyright,
    currentVersion,
    latestVersion,
    updateAvailable,
    versionLoading,
  } = useHelp();

  return (
    <Menu
      as="div"
      className="fixed bottom-[4.5rem] right-6 z-[99998] lg:bottom-6"
    >
      <Menu.Button
        type="button"
        className={clsx(
          "flex h-12 w-12 items-center justify-center rounded-full",
          "border border-zinc-200/80 dark:border-zinc-600/80",
          "bg-white dark:bg-zinc-800",
          "text-zinc-500 dark:text-zinc-400",
          "shadow-lg",
          "transition-all duration-200",
          "hover:border-[color:rgb(var(--group-theme)/0.3)]",
          "hover:bg-white dark:hover:bg-zinc-700/90",
          "hover:text-[color:rgb(var(--group-theme))]",
          "focus:outline-none focus-visible:ring-2",
          "focus-visible:ring-[color:rgb(var(--group-theme)/0.5)]",
          "focus-visible:ring-offset-2",
          "focus-visible:ring-offset-zinc-50",
          "dark:focus-visible:ring-offset-zinc-900",
          "active:scale-95",
        )}
        aria-label="Open help and resources menu"
        title="Help & resources"
      >
        <IconLifebuoy className="h-6 w-6" stroke={1.75} aria-hidden="true" />
      </Menu.Button>

      <Menu.Items
        className={clsx(
          "absolute right-0 bottom-full mb-2 w-56",
          "rounded-2xl",
          "border border-zinc-200/80 dark:border-zinc-600/80",
          "bg-white dark:bg-zinc-800",
          "py-2.5",
          "shadow-xl",
          "ring-1 ring-black/5 dark:ring-white/5",
          "focus:outline-none",
        )}
      >
        <div className="px-4 pb-2.5 pt-0.5">
          <p className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-white">
            Orbit
          </p>

          <p
            className={clsx(
              "mt-0.5 text-[11px]",
              updateAvailable
                ? "font-medium text-red-500 dark:text-red-400"
                : "text-zinc-500 dark:text-zinc-400",
            )}
            aria-live="polite"
          >
            {versionLoading
              ? "Checking for updates…"
              : currentVersion
                ? `v${currentVersion}`
                : "Version unavailable"}

            {updateAvailable && " · Update available"}
          </p>

          {updateAvailable && latestVersion && (
            <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
              Latest: v{latestVersion}
            </p>
          )}
        </div>

        <div
          className="mx-3 mb-2 h-px bg-zinc-200/80 dark:bg-zinc-600/80"
          role="separator"
        />

        <a
          href="https://docs.planetaryapp.us"
          target="_blank"
          rel="noopener noreferrer"
          className={menuItemClasses}
        >
          <IconBook
            className={menuIconClasses}
            stroke={1.5}
            aria-hidden="true"
          />
          <span>Documentation</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>

        <a
          href="https://github.com/planetaryorbit/orbit"
          target="_blank"
          rel="noopener noreferrer"
          className={menuItemClasses}
        >
          <IconBrandGithub
            className={menuIconClasses}
            stroke={1.5}
            aria-hidden="true"
          />
          <span>GitHub</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>

        <a
          href="https://feedback.planetaryapp.us/feature-requests"
          target="_blank"
          rel="noopener noreferrer"
          className={menuItemClasses}
        >
          <IconBug
            className={menuIconClasses}
            stroke={1.5}
            aria-hidden="true"
          />
          <span>Bug Reports</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>

        <Menu.Item>
          {({ active }) => (
            <button
              type="button"
              onClick={openChangelog}
              className={clsx(
                menuItemClasses,
                active && "bg-zinc-100 dark:bg-zinc-700/70",
              )}
            >
              <IconHistory
                className={menuIconClasses}
                stroke={1.5}
                aria-hidden="true"
              />
              <span>Changelog</span>
            </button>
          )}
        </Menu.Item>

        <div
          className="mx-3 my-2 h-px bg-zinc-200/80 dark:bg-zinc-600/80"
          role="separator"
        />

        <Menu.Item>
          {({ active }) => (
            <button
              type="button"
              onClick={openCopyright}
              className={clsx(
                menuItemClasses,
                active && "bg-zinc-100 dark:bg-zinc-700/70",
              )}
            >
              <IconLicense
                className={menuIconClasses}
                stroke={1.5}
                aria-hidden="true"
              />
              <span>Copyright & Licensing</span>
            </button>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}

export default HelpFloatingButton;
