import { useState, useEffect } from "react";
import { IconX, IconPin, IconPencil, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/router";
import axios from "axios";
import toast from "react-hot-toast";
import packageinfo from '@/package.json'
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";

const ANNOUNCEMENT_KEY = `announcementDismissed_${packageinfo.version}`;

interface Section {
  title: string;
  content: string;
}

interface Announcement {
  title: string;
  subtitle?: string;
  sections: Section[];
  editorUsername?: string | null;
  editorPicture?: string | null;
  isDefault?: boolean;
}

const defaultAnnouncement: Announcement = {
  title: "Planetary",
  subtitle: `Update: v${packageinfo.version} is now live!`,
  sections: [
    {
      title: "📚 Documentation rework",
      content:
        "We’ve completely reworked our documentation. Everything is clearer, faster, and easier to navigate. Check it out at https://docs.planetaryapp.us/",
    },
    {
      title: "🔧 Backend improvements",
      content:
        "We’ve pushed a wave of backend fixes and stability improvements. Things should feel smoother, faster, and more reliable overall ✨",
    },
    {
      title: "👤 Your profile, your control",
      content:
        "You can now view and edit your own profile — including birthday, timezone, and more personal settings. It’s your space, make it yours.",
    },
    {
      title: "🎨 UI rework",
      content:
        "We’ve reworked large parts of the UI with a cleaner, more modern feel. Go explore it — we think you’ll enjoy what the Planetary Team has been cooking up 👀",
    },
    {
      title: "🧑‍💻 User profile system overhaul",
      content:
        "User profiles have been fully migrated to our new internal user API. This makes everything more stable and sets the foundation for future features.",
    },
    {
      title: "",
      content:
        "That’s not even everything. Go poke around and see what else has changed — we’d rather let you discover it yourself 😉",
    },
  ],
  editorUsername: null,
  editorPicture: null,
  isDefault: true,
};

export default function StickyNoteAnnouncement() {
  const router = useRouter();
  const [workspace] = useRecoilState(workspacestate);
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement>(defaultAnnouncement);
  const [editData, setEditData] = useState<Announcement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(ANNOUNCEMENT_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (router.query.id) {
      fetchAnnouncement();
    }
  }, [router.query.id]);

  const fetchAnnouncement = async () => {
    try {
      const response = await axios.get(
        `/api/workspace/${router.query.id}/announcement`
      );
      if (response.data.success) {
        setAnnouncement(response.data.announcement);
        setCanEdit(response.data.canEdit);
      }
    } catch (error) {
      console.error("Error fetching announcement:", error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, "true");
    setIsVisible(false);
  };

  const handleEdit = () => {
    setEditData(announcement ? { ...announcement } : null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const handleSave = async () => {
    if (!editData) return;

    setIsSaving(true);
    try {
      const response = await axios.post(
        `/api/workspace/${router.query.id}/announcement/update`,
        {
          title: editData.title,
          subtitle: editData.subtitle,
          sections: editData.sections,
        }
      );

      if (response.data.success) {
        setAnnouncement(response.data.announcement);
        setIsEditing(false);
        setEditData(null);
        toast.success("Announcement updated successfully!");
      }
    } catch (error: any) {
      console.error("Error saving announcement:", error);
      toast.error(
        error.response?.data?.error || "Failed to update announcement"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateSection = (index: number, field: "title" | "content", value: string) => {
    if (!editData) return;
    const newSections = [...editData.sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setEditData({ ...editData, sections: newSections });
  };

  const addSection = () => {
    if (!editData) return;
    setEditData({
      ...editData,
      sections: [...editData.sections, { title: "", content: "" }],
    });
  };

  const removeSection = (index: number) => {
    if (!editData || editData.sections.length <= 1) return;
    const newSections = editData.sections.filter((_, i) => i !== index);
    setEditData({ ...editData, sections: newSections });
  };

  if (!isVisible) return null;

  const displayAnnouncement = isEditing ? editData : announcement;
  if (!displayAnnouncement) return null;

  return (
    <div className="z-0 bg-white dark:bg-zinc-900/70 rounded-2xl shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:shadow-zinc-950/30 p-4 flex items-start space-x-4 mb-6 relative">
      <img
        src={workspace?.groupThumbnail || "/favicon.png"}
        alt={workspace?.groupName || "Planetary"}
        className="w-10 h-10 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800 flex-shrink-0"
      />
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-3 pt-0.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Title</label>
                <input
                  type="text"
                  value={editData?.title || ""}
                  onChange={(e) => setEditData({ ...editData!, title: e.target.value })}
                  className="w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Subtitle</label>
                <input
                  type="text"
                  value={editData?.subtitle || ""}
                  onChange={(e) => setEditData({ ...editData!, subtitle: e.target.value })}
                  className="w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              {editData?.sections.map((section, index) => (
                <div key={index} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Section {index + 1}</span>
                    {editData.sections.length > 1 && (
                      <button
                        onClick={() => removeSection(index)}
                        className="text-[11px] font-medium text-red-400 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Section title (optional)"
                    value={section.title}
                    onChange={(e) => updateSection(index, "title", e.target.value)}
                    className="mb-2 w-full rounded-lg border-0 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-none focus:outline-none focus:ring-1 focus:ring-primary dark:bg-zinc-700 dark:text-white"
                  />
                  <textarea
                    placeholder="Section content"
                    value={section.content}
                    onChange={(e) => updateSection(index, "content", e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border-0 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary dark:bg-zinc-700 dark:text-white resize-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addSection}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              + Add section
            </button>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <IconCheck className="w-3.5 h-3.5" />
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-1">
              <IconPin className="w-4 h-4 text-zinc-500 dark:text-zinc-300" />
              {displayAnnouncement.title}
            </h3>

            <div className="text-zinc-800 dark:text-zinc-300 text-sm space-y-3">
              {displayAnnouncement.subtitle && (
                <h4 className="text-base font-semibold text-zinc-900 dark:text-white">
                  {displayAnnouncement.subtitle}
                </h4>
              )}

              {displayAnnouncement.sections.map((section, index) => (
                <div key={index}>
                  {section.title && (
                    <p className="font-semibold mt-2">{section.title}</p>
                  )}
                  <p>{section.content}</p>
                </div>
              ))}

              {!announcement.isDefault && announcement.editorUsername && (
                <div className="pt-3 mt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    {announcement.editorPicture && (
                      <img
                        src={announcement.editorPicture}
                        alt={announcement.editorUsername}
                        className="w-5 h-5 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Last edited by {announcement.editorUsername}
                    </p>
                  </div>
                </div>
              )}

              {announcement.isDefault && (
                <>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    That's a wrap for this week — we'll see you next Saturday
                    for more updates from Team Planetary.
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
                      href="https://suggestions.planetaryapp.us"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ml-1 text-primary underline"
                    >
                      our suggestions website
                    </a>
                    .
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {!isEditing && (
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={handleEdit}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              aria-label="Edit announcement"
            >
              <IconPencil className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            aria-label="Close announcement"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
