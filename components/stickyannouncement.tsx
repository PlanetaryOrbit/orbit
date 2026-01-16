import { useState, useEffect } from "react";
import { IconX, IconPin, IconPencil, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/router";
import axios from "axios";
import toast from "react-hot-toast";

const ANNOUNCEMENT_KEY = "announcementDismissed_v2";

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
  subtitle: "Update: v2.1.8 is now live!",
  sections: [
    {
      title: "",
      content:
        "We're keeping this going with a well needed update. Here are a few highlights from this week's work and community feedback.",
    },
    {
      title: "💼 Permissions",
      content:
        "We now have over 50 permissions available to assign to roles!",
    },
    {
      title: "🧹",
      content:
        "Improved overall performance and stability across the board.",
    },
    {
      title: "",
      content:
        "That's a wrap for this week — we'll see you soon for more updates from Team Planetary.",
    },
  ],
  editorUsername: null,
  editorPicture: null,
  isDefault: true,
};

export default function StickyNoteAnnouncement() {
  const router = useRouter();
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
      console.log('API Response:', response.data);
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
    <div className="z-0 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 flex items-start space-x-4 mb-6 relative">
      <img
        src="/favicon-32x32.png"
        alt="Orbit"
        className="w-10 h-10 rounded-full bg-primary flex-shrink-0"
      />
      <div className="flex-1">
        {isEditing ? (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editData?.title || ""}
                onChange={(e) =>
                  setEditData({ ...editData!, title: e.target.value })
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={editData?.subtitle || ""}
                onChange={(e) =>
                  setEditData({ ...editData!, subtitle: e.target.value })
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-3">
              {editData?.sections.map((section, index) => (
                <div
                  key={index}
                  className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700"
                >
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Section {index + 1}
                    </label>
                    {editData.sections.length > 1 && (
                      <button
                        onClick={() => removeSection(index)}
                        className="text-red-500 hover:text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Section title (optional)"
                    value={section.title}
                    onChange={(e) =>
                      updateSection(index, "title", e.target.value)
                    }
                    className="w-full px-2 py-1 mb-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <textarea
                    placeholder="Section content"
                    value={section.content}
                    onChange={(e) =>
                      updateSection(index, "content", e.target.value)
                    }
                    rows={3}
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addSection}
              className="mt-3 text-sm text-primary hover:text-primary/80 font-medium"
            >
              + Add Section
            </button>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <IconCheck className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
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
                      href="https://discord.gg/planetary"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ml-1 text-primary underline"
                    >
                      .gg/planetary
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
