import { useState, useEffect } from "react";
import { IconX, IconPin } from "@tabler/icons-react";
const ANNOUNCEMENT_KEY = "announcementDismissed_v2_1_7b1";

export default function StickyNoteAnnouncement() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(ANNOUNCEMENT_KEY);
    if (!dismissed) setIsVisible(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="z-0 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 flex items-start space-x-4 mb-6 relative">
      <img
        src="/favicon-32x32.png"
        alt="Orbit"
        className="w-10 h-10 rounded-full bg-primary flex-shrink-0"
      />
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-1">
          <IconPin className="w-4 h-4 text-zinc-500 dark:text-zinc-300" />
          Planetary
        </h3>

        <div className="text-zinc-800 dark:text-zinc-300 text-sm space-y-3">
          <h4 className="text-base font-semibold text-zinc-900 dark:text-white">
            Update: v2.1.7 is now live!
          </h4>
          <p>
            We're keeping this going with a well needed update. Here are a few
            highlights from this week's work and community feedback.
          </p>
          <div>
            <p className="font-semibold mt-2">📖 Sessions</p>
            <p>
              We have updated our session logic, so when editing recurring
              sessions you have the option to edit the one session or all the
              events in the series.
            </p>
          </div>
          <div>
            <p className="font-semibold mt-2">👤 Profiles</p>
            <p>
              We have refreshed how all the staff profiles look and the
              information that shows up. You can now see activity quotas,
              session history, and activity overview all in one place! As well
              as new information like Timezone, Department etc!
            </p>
          </div>
          <div>
            <p className="font-semibold mt-2">🎂 Birthdays</p>
            <p>
              We have added the ability for you to add a webhook which announced
              the birthdays of people on your workspace.
            </p>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            That’s a wrap for this week — we’ll see you next Saturday for more
            updates from Team Planetary.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Read the full changelog
            <a
              href="/api/changelog"
              target="_blank"
              rel="noreferrer noopener"
              className="ml-1 text-primary underline"
            >
              here
            </a>
            . Submit suggestions in
            <a
              href="https://discord.gg/planetary"
              target="_blank"
              rel="noreferrer noopener"
              className="ml-1 text-primary underline"
            >
              .gg/planetary
            </a>
            .
          </p>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        aria-label="Close announcement"
      >
        <IconX className="w-5 h-5" />
      </button>
    </div>
  );
}